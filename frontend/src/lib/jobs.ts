/* ---------------------------------------------------------------
   Agape — jobs API
   ---------------------------------------------------------------
   The contract the UI is written against. The backend only serves
   /health today, so `createProject` hands back a mock job and
   `subscribeToJob` plays a scripted event stream against it. Swap the
   bodies for fetch + SSE when the FastAPI side lands; nothing upstream
   changes.
   --------------------------------------------------------------- */

import { brandFromUrl } from './brand'

export type StageId = 'scout' | 'curator' | 'strategist' | 'writer' | 'director'

export type Artifact = {
  kind: 'color' | 'logo' | 'font' | 'copy'
  value: string
  label: string
}

export type Job = {
  id: string
  url: string
  source: 'mock' | 'live'
}

export type JobEvent =
  | { type: 'stage'; stage: StageId; status: 'working' | 'done'; label: string | null }
  | { type: 'log'; message: string }
  | { type: 'artifact'; artifact: Artifact }
  | { type: 'decision'; format: string; reason: string }
  | { type: 'script'; line: string }
  | { type: 'frame'; index: number; title: string }
  | { type: 'progress'; value: number }
  | { type: 'done'; projectId: string }
  | { type: 'error'; message: string }

export async function createProject(url: string): Promise<Job> {
  // Small delay so the "starting" phase is visible instead of a flash.
  await new Promise((resolve) => setTimeout(resolve, 220))
  return { id: `mock-${Date.now().toString(36)}`, url, source: 'mock' }
}

export function setProjectFormat(_job: Job, _format: string): Promise<void> {
  // Optimistic no-op until the backend exists.
  return Promise.resolve()
}

/** [delay-ms-after-previous, event] */
type Beat = [number, JobEvent]

function scriptFor(job: Job): Beat[] {
  const brand = brandFromUrl(job.url)
  const name = brand.name

  return [
    [0, { type: 'stage', stage: 'scout', status: 'working', label: 'reading the site' }],
    [300, { type: 'log', message: `GET https://${brand.domain} — 200` }],
    [500, { type: 'progress', value: 0.08 }],
    [400, { type: 'log', message: 'parsing DOM, 42 nodes of interest' }],
    [600, { type: 'stage', stage: 'scout', status: 'done', label: 'site read' }],
    [0, { type: 'stage', stage: 'curator', status: 'working', label: 'pulling the brand' }],
    [500, { type: 'artifact', artifact: { kind: 'color', value: brand.accent, label: 'accent' } }],
    [350, { type: 'artifact', artifact: { kind: 'logo', value: name.charAt(0).toUpperCase(), label: 'monogram' } }],
    [350, { type: 'artifact', artifact: { kind: 'copy', value: 'Something big is coming.', label: 'tagline' } }],
    [200, { type: 'progress', value: 0.3 }],
    [400, { type: 'stage', stage: 'curator', status: 'done', label: '3 artifacts' }],
    [0, { type: 'stage', stage: 'strategist', status: 'working', label: 'choosing a format' }],
    [900, {
      type: 'decision',
      format: 'Launch teaser — 7s, 16:9',
      reason: `${name} is pre-launch: short and cinematic beats a feature tour nobody can follow yet.`,
    }],
    [200, { type: 'progress', value: 0.45 }],
    [300, { type: 'stage', stage: 'strategist', status: 'done', label: 'launch teaser' }],
    [0, { type: 'stage', stage: 'writer', status: 'working', label: 'writing the beats' }],
    [500, { type: 'script', line: `INTRODUCING ${name.toUpperCase()}` }],
    [450, { type: 'script', line: 'Something big is coming.' }],
    [450, { type: 'script', line: brand.domain }],
    [200, { type: 'progress', value: 0.62 }],
    [300, { type: 'stage', stage: 'writer', status: 'done', label: '3 lines' }],
    [0, { type: 'stage', stage: 'director', status: 'working', label: 'assembling shots' }],
    [500, { type: 'frame', index: 0, title: 'phone rises' }],
    [450, { type: 'frame', index: 1, title: 'title lands' }],
    [450, { type: 'frame', index: 2, title: 'tagline' }],
    [450, { type: 'frame', index: 3, title: 'domain pill' }],
    [200, { type: 'progress', value: 0.92 }],
    [500, { type: 'log', message: 'composition "main" ready — 210 frames @ 30fps' }],
    [300, { type: 'stage', stage: 'director', status: 'done', label: '4 shots' }],
    [200, { type: 'done', projectId: job.id }],
  ]
}

/**
 * Plays the scripted stream for `job`. Returns an unsubscribe that stops
 * the remaining beats — safe to call mid-stream (StrictMode remounts).
 */
export function subscribeToJob(
  job: Job,
  onEvent: (event: JobEvent) => void,
): () => void {
  let cancelled = false
  let timer: ReturnType<typeof setTimeout> | undefined

  const beats = scriptFor(job)
  let index = 0

  const step = () => {
    if (cancelled || index >= beats.length) return
    const [delay, event] = beats[index]
    timer = setTimeout(() => {
      if (cancelled) return
      onEvent(event)
      index += 1
      step()
    }, delay)
  }

  step()

  return () => {
    cancelled = true
    if (timer) clearTimeout(timer)
  }
}
