/* ---------------------------------------------------------------
   Agape — the job pipeline
   ---------------------------------------------------------------
   Mirrors the event contract the frontend already speaks
   (frontend/src/lib/jobs.ts). Events are buffered per job and replayed
   on subscribe, because the client POSTs first and opens the stream a
   moment later — without the buffer the first few events vanish.
   --------------------------------------------------------------- */

import { scrape, ScrapeError, type Scraped } from './scrape.ts'

export type StageId = 'scout' | 'curator' | 'strategist' | 'writer' | 'director'

export type Artifact = {
  kind: 'color' | 'font' | 'logo' | 'copy' | 'image'
  value: string
  label: string
}

export type JobEvent =
  | { type: 'stage'; stage: StageId; status: 'working' | 'done'; label: string }
  | { type: 'log'; message: string }
  | { type: 'artifact'; artifact: Artifact }
  | { type: 'decision'; format: string; reason: string }
  | { type: 'script'; line: string }
  | { type: 'frame'; index: number; title: string }
  | { type: 'progress'; value: number }
  | { type: 'done'; projectId: string }
  | { type: 'error'; message: string }

export type Subscriber = (event: JobEvent) => void

export type Job = {
  id: string
  url: string
  events: JobEvent[]
  subscribers: Set<Subscriber>
  finished: boolean
  format: string | null
  /** Populated once the curator has read the site — feeds the renderer. */
  scene: { brandName: string; domain: string; accent: string } | null
}

const jobs = new Map<string, Job>()

export function getJob(id: string): Job | undefined {
  return jobs.get(id)
}

function emit(job: Job, event: JobEvent): void {
  job.events.push(event)
  for (const send of job.subscribers) send(event)
}

/** Replays what's already happened, then keeps the caller subscribed. */
export function subscribe(job: Job, send: Subscriber): () => void {
  for (const event of job.events) send(event)
  if (job.finished) return () => {}

  job.subscribers.add(send)
  return () => job.subscribers.delete(send)
}

export function setFormat(job: Job, format: string): void {
  job.format = format
}

const pause = (ms: number) => new Promise((r) => setTimeout(r, ms))

export function createJob(id: string, url: string): Job {
  const job: Job = {
    id,
    url,
    events: [],
    subscribers: new Set(),
    finished: false,
    format: null,
    scene: null,
  }

  jobs.set(id, job)
  void run(job)
  return job
}

async function run(job: Job): Promise<void> {
  try {
    const site = await scout(job)
    curate(job, site)
    await strategise(job, site)
    await write(job, site)
    await direct(job)

    emit(job, { type: 'progress', value: 1 })
    emit(job, { type: 'done', projectId: job.id })
  } catch (cause) {
    const message =
      cause instanceof ScrapeError
        ? cause.message
        : cause instanceof Error
          ? cause.message
          : String(cause)
    emit(job, { type: 'error', message })
  } finally {
    job.finished = true
    job.subscribers.clear()
  }
}

async function scout(job: Job): Promise<Scraped> {
  emit(job, { type: 'stage', stage: 'scout', status: 'working', label: 'Reading the site' })
  emit(job, { type: 'log', message: `GET ${job.url}` })

  const site = await scrape(job.url)

  emit(job, { type: 'log', message: `Read ${site.domain}` })
  if (site.description) {
    emit(job, { type: 'log', message: `“${site.description.slice(0, 70)}…”` })
  }
  emit(job, { type: 'progress', value: 0.2 })
  emit(job, { type: 'stage', stage: 'scout', status: 'done', label: 'Site read' })

  return site
}

function curate(job: Job, site: Scraped): void {
  emit(job, { type: 'stage', stage: 'curator', status: 'working', label: 'Pulling brand' })

  job.scene = { brandName: site.name, domain: site.domain, accent: site.accent }

  emit(job, {
    type: 'artifact',
    artifact: { kind: 'color', value: site.accent, label: 'Primary' },
  })
  emit(job, {
    type: 'artifact',
    artifact: { kind: 'logo', value: site.name.charAt(0).toUpperCase(), label: `${site.name} mark` },
  })

  for (const font of site.fonts) {
    emit(job, { type: 'artifact', artifact: { kind: 'font', value: font, label: 'Type' } })
  }
  if (site.tagline) {
    emit(job, {
      type: 'artifact',
      artifact: { kind: 'copy', value: site.tagline.slice(0, 60), label: 'Tagline' },
    })
  }
  if (site.image) {
    emit(job, {
      type: 'artifact',
      artifact: { kind: 'image', value: site.image.split('/').pop() ?? 'hero', label: 'Hero shot' },
    })
  }

  emit(job, { type: 'progress', value: 0.42 })
  emit(job, { type: 'stage', stage: 'curator', status: 'done', label: 'Brand pulled' })
}

async function strategise(job: Job, site: Scraped): Promise<void> {
  emit(job, { type: 'stage', stage: 'strategist', status: 'working', label: 'Choosing a format' })
  emit(job, { type: 'log', message: 'Weighing: launch teaser · demo walkthrough · ad cut' })
  await pause(600)

  const format = job.format ?? 'Launch teaser — 7s, 16:9'
  job.format = format

  emit(job, {
    type: 'decision',
    format,
    reason: site.description
      ? `The site leads with "${site.description.slice(0, 48)}…" — one clear promise, so a short teaser lands harder than a walkthrough.`
      : 'The site leads with a product shot and a single call to action, so a short teaser lands harder than a walkthrough.',
  })

  emit(job, { type: 'progress', value: 0.58 })
  emit(job, { type: 'stage', stage: 'strategist', status: 'done', label: 'Format chosen' })
}

async function write(job: Job, site: Scraped): Promise<void> {
  emit(job, { type: 'stage', stage: 'writer', status: 'working', label: 'Writing the script' })

  const title = site.name.charAt(0).toUpperCase() + site.name.slice(1)
  const lines = [
    `Meet ${title}.`,
    site.description?.split(/[.!?]/)[0]?.trim() || 'Something big is coming.',
    site.domain,
  ]

  for (const line of lines) {
    await pause(400)
    emit(job, { type: 'script', line })
  }

  emit(job, { type: 'progress', value: 0.76 })
  emit(job, { type: 'stage', stage: 'writer', status: 'done', label: 'Script written' })
}

async function direct(job: Job): Promise<void> {
  emit(job, { type: 'stage', stage: 'director', status: 'working', label: 'Storyboarding' })

  // These are the beats the Remotion composition actually renders.
  const frames = [
    'Phone rises out of the dark',
    'Brand screen resolves',
    'Title card + domain',
  ]

  for (const [index, title] of frames.entries()) {
    await pause(350)
    emit(job, { type: 'frame', index, title })
  }

  emit(job, { type: 'progress', value: 0.94 })
  emit(job, { type: 'stage', stage: 'director', status: 'done', label: 'Storyboard ready' })
}
