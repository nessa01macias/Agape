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
  /** When it stopped running — the sweeper reads this. */
  finishedAt?: number
}

const renders = new Map<string, RenderJob>()

export function getRender(id: string): RenderJob | undefined {
  return renders.get(id)
}

/**
 * Finished cuts are kept only long enough to be downloaded.
 *
 * On Cloud Run the filesystem is memory, so an MP4 that is never deleted
 * is a permanent charge against the instance's limit — and with
 * min-instances=1 the process never restarts to clear it. A few hours of
 * local development left 26 files and 64 MB behind, which in production
 * is an OOM kill that takes every in-flight job with it.
 */
const KEEP_MS = 30 * 60 * 1000

function sweep(): void {
  const cutoff = Date.now() - KEEP_MS

  for (const [id, job] of renders) {
    if (job.status === 'queued' || job.status === 'rendering') continue
    if (job.finishedAt && job.finishedAt > cutoff) continue

    fs.rm(job.file, { force: true }, () => {})
    renders.delete(id)
  }
}

// `unref` so a pending sweep never holds the process open.
setInterval(sweep, 5 * 60 * 1000).unref()

/**
 * Webpack costs ~10s and only changes when the composition does, so build
 * once and share. Held as a promise so concurrent first-hits don't race.
 */
let bundlePromise: Promise<string> | null = null

export function getBundle(): Promise<string> {
  /*
   * `symlinkPublicDir` matters more than it looks: the bundle is written
   * under os.tmpdir(), and on Cloud Run /tmp is memory. Left at its
   * default of false, Remotion physically copies frontend/public — 22 MB,
   * most of it agape-background-1.mov — into RAM on every cold start.
   */
  bundlePromise ??= bundle({ entryPoint: ENTRY, symlinkPublicDir: true })
  return bundlePromise
}

/**
 * `swangle` is ANGLE over SwiftShader — pure software, so it works on any
 * box with no GPU, which is what Cloud Run gives us. It is also roughly
 * an order of magnitude slower than hardware GL: the same cut renders in
 * ~9s with `angle` on a Mac and ~180s with `swangle`.
 *
 * So: default to the one that works everywhere, and let a developer opt
 * into the fast path locally with AGAPE_GL=angle. Never set that in
 * production — bare ANGLE needs a real GPU driver stack and every render
 * fails without one.
 */
const GL = (process.env.AGAPE_GL ?? 'swangle') as 'swangle' | 'angle'

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
        /*
         * `swangle` (ANGLE over SwiftShader/Vulkan), not `angle`. Bare
         * ANGLE picks its native GL/EGL backend, which needs a real GPU
         * driver stack — so on Cloud Run, which has no GPU, WebGL context
         * creation returns null and three.js throws inside the
         * composition. Because the backend is forced explicitly, Chrome
         * does not fall back to software on its own. Remotion's own docs:
         * "On a machine with no GPU, swangle is recommended."
         *
         * Only go back to 'angle' on a GPU-backed runtime, which also
         * needs Mesa in the image and /dev/dri exposed.
         */
        chromiumOptions: { gl: GL },
        /*
         * Remotion's default is 30s, and software GL blows straight past
         * it while Chrome boots — "Timed out after 30000ms while setting
         * up the headless browser". Costs nothing when the browser starts
         * quickly; saves the render when it doesn't.
         */
        timeoutInMilliseconds: 120_000,
        onProgress: ({ progress }) => {
          job.progress = progress
        },
      })

      job.progress = 1
      job.status = 'done'
      job.finishedAt = Date.now()
      console.log(`[render] ${id} -> ${job.file}`)
    } catch (cause) {
      job.status = 'error'
      job.finishedAt = Date.now()
      job.error = cause instanceof Error ? cause.message : String(cause)
      console.error(`[render] ${id} failed:`, cause)
    }
  })

  return job
}
