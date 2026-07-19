/* ---------------------------------------------------------------
   Agape — the job pipeline
   ---------------------------------------------------------------
   Mirrors the event contract the frontend already speaks
   (frontend/src/lib/jobs.ts). Events are buffered per job and replayed
   on subscribe, because the client POSTs first and opens the stream a
   moment later — without the buffer the first few events vanish.
   --------------------------------------------------------------- */

import { randomUUID } from 'node:crypto'
import { scrape, ScrapeError, type Scraped } from './scrape.ts'
import { startRender } from './render.ts'
import { fallbackPlan, planVideo, type VideoPlan } from './plan.ts'

export type StageId = 'scout' | 'curator' | 'strategist' | 'writer' | 'director'

export type Artifact = {
  kind: 'color' | 'font' | 'logo' | 'copy' | 'image'
  /** Display text. The UI prints this, so keep it short. */
  value: string
  label: string
  /**
   * Where the asset actually lives, when `value` is only a name for it.
   * Firecrawl's screenshot URLs are signed and expire — download before
   * persisting anything that points at one.
   */
  src?: string
}

export type JobEvent =
  | { type: 'stage'; stage: StageId; status: 'working' | 'done'; label: string }
  | { type: 'log'; message: string }
  | { type: 'artifact'; artifact: Artifact }
  | { type: 'decision'; format: string; reason: string }
  | { type: 'script'; line: string }
  | { type: 'frame'; index: number; title: string }
  | { type: 'progress'; value: number }
  | { type: 'done'; projectId: string; renderId?: string }
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
  /** What the model decided to cut. Null until the strategist runs. */
  plan: VideoPlan | null
  /** The rendered MP4, once the director has actually produced one. */
  renderId: string | null
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
    plan: null,
    renderId: null,
  }

  jobs.set(id, job)
  void run(job)
  return job
}

async function run(job: Job): Promise<void> {
  try {
    const site = await scout(job)
    await curate(job, site)
    await strategise(job, site)
    await write(job, site)
    await direct(job, site)
    await renderCut(job)

    emit(job, { type: 'progress', value: 1 })
    emit(job, {
      type: 'done',
      projectId: job.id,
      ...(job.renderId ? { renderId: job.renderId } : {}),
    })
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

/**
 * How many rendered shots to capture per job. Each costs a Firecrawl
 * credit, so it's tunable — and the whole deep pass is skipped when
 * there's no key, which downgrades to metadata rather than failing.
 */
const SHOTS = Number(process.env.AGAPE_SCREENSHOTS ?? 2)

/** How many of the page's own images to hand the UI to animate with. */
const FOOTAGE = 6

/** Matches the Remotion composition in frontend/src/remotion/constants.ts. */
const VIDEO_LABEL = '210 frames at 1920x1080'

async function scout(job: Job): Promise<Scraped> {
  emit(job, { type: 'stage', stage: 'scout', status: 'working', label: 'Reading the site' })
  emit(job, { type: 'log', message: `GET ${job.url}` })

  const deep = Boolean(process.env.FIRECRAWL_API_KEY)
  const site = await scrape(job.url, {
    full: deep,
    screenshots: deep ? SHOTS : 0,
  })

  emit(job, { type: 'log', message: `Read ${site.domain}` })
  if (site.fonts.length) {
    emit(job, { type: 'log', message: `Set in ${site.fonts.join(', ')}` })
  }
  if (site.images.length) {
    emit(job, {
      type: 'log',
      message: `${site.images.length} images, ${site.textBlocks.length} blocks of copy`,
    })
  }
  if (site.description) {
    emit(job, { type: 'log', message: `“${site.description.slice(0, 70)}…”` })
  }
  emit(job, { type: 'progress', value: 0.2 })
  emit(job, { type: 'stage', stage: 'scout', status: 'done', label: 'Site read' })

  return site
}

async function curate(job: Job, site: Scraped): Promise<void> {
  emit(job, { type: 'stage', stage: 'curator', status: 'working', label: 'Pulling brand' })

  job.scene = { brandName: site.name, domain: site.domain, accent: site.accent }

  /*
   * Paced, not instant. The scrape finishes in one tick, so without this
   * every artifact lands in the same millisecond and the tray pops fully
   * formed — which reads as a canned animation rather than work landing.
   */
  const beat = () => pause(260)

  /*
   * Shots first. This is the moment the screen stops looking like a
   * loading animation and starts looking like *their* site — holding it
   * back behind five brand chips left it on screen for under a second
   * before the turn swept it away.
   */
  for (const [i, shot] of site.screenshots.entries()) {
    await beat()
    emit(job, {
      type: 'artifact',
      artifact: {
        kind: 'image',
        // The signed URL is 700-odd characters; the UI prints `value`, so
        // give it a name and keep the URL in `src`.
        value: i === 0 ? 'landing.png' : `page-${i + 1}.png`,
        label: i === 0 ? 'Landing page' : `Page ${i + 1}`,
        src: shot,
      },
    })
  }

  await beat()
  emit(job, {
    type: 'artifact',
    artifact: { kind: 'color', value: site.accent, label: 'Primary' },
  })
  await beat()
  emit(job, {
    type: 'artifact',
    artifact: { kind: 'logo', value: site.name.charAt(0).toUpperCase(), label: `${site.name} mark` },
  })

  for (const font of site.fonts) {
    await beat()
    emit(job, { type: 'artifact', artifact: { kind: 'font', value: font, label: 'Type' } })
  }
  if (site.tagline) {
    await beat()
    emit(job, {
      type: 'artifact',
      artifact: { kind: 'copy', value: site.tagline.slice(0, 60), label: 'Tagline' },
    })
  }
  if (site.image) {
    await beat()
    emit(job, {
      type: 'artifact',
      artifact: {
        kind: 'image',
        value: site.image.split('/').pop() ?? 'hero',
        label: 'Hero shot',
        src: site.image,
      },
    })
  }

  /*
   * The rest of the page's imagery. These are what the loading screen
   * animates with and what the cut is built from, so they go over the
   * wire as real URLs rather than names.
   */
  const footage = site.images.filter((src) => src !== site.image).slice(0, FOOTAGE)
  for (const [i, src] of footage.entries()) {
    await beat()
    emit(job, {
      type: 'artifact',
      artifact: {
        kind: 'image',
        value: src.split('/').pop()?.split('?')[0] || `image-${i + 1}`,
        label: `Image ${i + 1}`,
        src,
      },
    })
  }

  emit(job, { type: 'progress', value: 0.42 })
  emit(job, { type: 'stage', stage: 'curator', status: 'done', label: 'Brand pulled' })
}

/**
 * One model call covers strategist, writer and director — it sees the
 * page shots once and decides format, script and shot list together,
 * which keeps them consistent with each other. The stages below just
 * narrate the parts of that plan as they become relevant.
 */
async function strategise(job: Job, site: Scraped): Promise<void> {
  emit(job, { type: 'stage', stage: 'strategist', status: 'working', label: 'Choosing a format' })
  emit(job, { type: 'log', message: 'Weighing: launch teaser · demo walkthrough · ad cut' })

  const plan = await planVideo(site, (message) => emit(job, { type: 'log', message }))
  job.plan = plan

  // The model reads the accent off the rendered page; the scraper only
  // counts hex codes in markup, which misses CSS-in-JS and image-heavy
  // brands. Prefer the model's when it gave us one.
  if (job.scene && plan.fromModel) job.scene.accent = plan.accent

  // An override from the UI wins — the user picked it deliberately.
  const format = job.format ?? plan.format
  job.format = format

  emit(job, { type: 'decision', format, reason: plan.reason })
  emit(job, { type: 'progress', value: 0.58 })
  emit(job, { type: 'stage', stage: 'strategist', status: 'done', label: 'Format chosen' })
}

async function write(job: Job, site: Scraped): Promise<void> {
  emit(job, { type: 'stage', stage: 'writer', status: 'working', label: 'Writing the script' })

  const plan = job.plan ?? fallbackPlan(site)

  for (const line of plan.script) {
    await pause(400)
    emit(job, { type: 'script', line })
  }

  emit(job, { type: 'progress', value: 0.76 })
  emit(job, { type: 'stage', stage: 'writer', status: 'done', label: 'Script written' })
}

async function direct(job: Job, site: Scraped): Promise<void> {
  emit(job, { type: 'stage', stage: 'director', status: 'working', label: 'Storyboarding' })

  const plan = job.plan ?? fallbackPlan(site)

  for (const [index, shot] of plan.shots.entries()) {
    await pause(350)
    emit(job, { type: 'frame', index, title: shot.title })
  }

  emit(job, { type: 'progress', value: 0.80 })
}

/**
 * The actual render. Until this existed the job reported "ready" the
 * moment the *plan* was written, which meant the loading screen finished
 * before anything had been produced. Now `done` means an MP4 exists on
 * disk, and the progress the user watches is Remotion's real frame
 * count rather than a script.
 */
async function renderCut(job: Job): Promise<void> {
  if (!job.scene) return

  emit(job, { type: 'stage', stage: 'director', status: 'working', label: 'Rendering the cut' })

  const [eyebrow, tagline, footer] = job.plan?.script ?? []
  const id = randomUUID()
  const render = startRender(id, {
    ...job.scene,
    ...(eyebrow ? { eyebrow } : {}),
    ...(tagline ? { tagline } : {}),
    ...(footer ? { footer } : {}),
  })

  emit(job, { type: 'log', message: `Rendering ${VIDEO_LABEL}` })

  // Poll rather than subscribe: renderMedia reports through a callback on
  // its own job object, and one queue means we may sit in `queued` first.
  let reported = 0.8
  while (render.status === 'queued' || render.status === 'rendering') {
    await pause(400)
    const value = 0.8 + render.progress * 0.19
    if (value - reported >= 0.01) {
      reported = value
      emit(job, { type: 'progress', value })
    }
  }

  if (render.status === 'error') {
    throw new Error(render.error ?? 'The render failed')
  }

  job.renderId = id
  emit(job, { type: 'log', message: 'Encoded to H.264' })
  emit(job, { type: 'progress', value: 0.99 })
  emit(job, { type: 'stage', stage: 'director', status: 'done', label: 'Cut rendered' })
}
