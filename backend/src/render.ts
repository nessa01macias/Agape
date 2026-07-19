/* ---------------------------------------------------------------
   Agape — MP4 rendering
   ---------------------------------------------------------------
   The reason this backend is Node. `@remotion/renderer` drives a real
   Chrome and has no Python equivalent.

   Remotion's bundler takes a *file path*, not a module import, so we
   point straight at the frontend's composition. One Scene, previewed in
   the browser and rendered here — they can't drift.
   --------------------------------------------------------------- */

import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { bundle } from '@remotion/bundler'
import { renderMedia, selectComposition } from '@remotion/renderer'
import { z } from 'zod'

const here = path.dirname(fileURLToPath(import.meta.url))

const ENTRY = path.resolve(here, '../../frontend/src/remotion/index.ts')

/*
 * Overridable because a container's filesystem is memory-backed on Cloud
 * Run — writing MP4s into the image eats the instance's RAM. In
 * production this points at /tmp; locally it stays backend/out.
 */
export const OUT_DIR = process.env.AGAPE_OUT_DIR
  ? path.resolve(process.env.AGAPE_OUT_DIR)
  : path.resolve(here, '../out')

/**
 * Loose mirror of `launchSchema` in frontend/src/remotion/LaunchTemplate.tsx.
 * Only the identity fields are validated here; the rest (copy, theme,
 * screenshot) passes through and the composition defaults what's absent.
 */
export const sceneProps = z
  .object({
    brandName: z.string().min(1),
    domain: z.string().min(1),
  })
  .passthrough()

export type SceneProps = z.infer<typeof sceneProps>

export type RenderJob = {
  id: string
  status: 'queued' | 'rendering' | 'done' | 'error'
  progress: number
  file: string
  error?: string
}

const renders = new Map<string, RenderJob>()

export function getRender(id: string): RenderJob | undefined {
  return renders.get(id)
}

/**
 * Webpack costs ~10s and only changes when the composition does, so build
 * once and share. Held as a promise so concurrent first-hits don't race.
 */
let bundlePromise: Promise<string> | null = null

export function getBundle(): Promise<string> {
  bundlePromise ??= bundle({ entryPoint: ENTRY })
  return bundlePromise
}

/**
 * Renders are heavy on CPU and GPU; running them in parallel on one box
 * just makes every one of them slower. Strictly one at a time.
 */
let chain: Promise<void> = Promise.resolve()

export function startRender(id: string, props: SceneProps): RenderJob {
  fs.mkdirSync(OUT_DIR, { recursive: true })

  const job: RenderJob = {
    id,
    status: 'queued',
    progress: 0,
    file: path.join(OUT_DIR, `${id}.mp4`),
  }
  renders.set(id, job)

  chain = chain.then(async () => {
    job.status = 'rendering'
    try {
      const serveUrl = await getBundle()

      const composition = await selectComposition({
        serveUrl,
        id: 'Launch',
        inputProps: props,
      })

      await renderMedia({
        composition,
        serveUrl,
        codec: 'h264',
        outputLocation: job.file,
        inputProps: props,
        // three.js needs a real GL backend — the software rasteriser
        // renders the phone as a black rectangle.
        chromiumOptions: { gl: 'angle' },
        onProgress: ({ progress }) => {
          job.progress = progress
        },
      })

      job.progress = 1
      job.status = 'done'
      console.log(`[render] ${id} -> ${job.file}`)
    } catch (cause) {
      job.status = 'error'
      job.error = cause instanceof Error ? cause.message : String(cause)
      console.error(`[render] ${id} failed:`, cause)
    }
  })

  return job
}
