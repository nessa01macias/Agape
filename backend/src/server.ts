/* ---------------------------------------------------------------
   Agape — API
   ---------------------------------------------------------------
     POST  /api/projects            { url } -> { job_id }
     GET   /api/projects/:id/events -> SSE stream of JobEvent
     PATCH /api/projects/:id/format { format }

     POST  /api/projects/:id/render -> { render_id }
     GET   /api/renders/:id         -> { status, progress }
     GET   /api/renders/:id/file    -> the MP4

   The project routes are the contract frontend/src/lib/jobs.ts already
   speaks, so the moment this is running the frontend stops using its
   mock and goes live. No flag to flip.
   --------------------------------------------------------------- */

import { randomUUID } from 'node:crypto'
import express from 'express'
import { createJob, getJob, setFormat, subscribe } from './pipeline.ts'
import { getBundle, getRender, sceneProps, startRender } from './render.ts'

const PORT = Number(process.env.PORT ?? 8000)

const app = express()
app.use(express.json())

app.get('/health', (_req, res) => {
  res.json({ status: 'ok' })
})

app.post('/api/projects', (req, res) => {
  const url = typeof req.body?.url === 'string' ? req.body.url.trim() : ''
  if (!url) {
    res.status(400).json({ error: 'url is required' })
    return
  }

  const id = randomUUID()
  createJob(id, url)
  res.status(201).json({ job_id: id })
})

app.get('/api/projects/:id/events', (req, res) => {
  const job = getJob(req.params.id)
  if (!job) {
    res.status(404).json({ error: 'No such project' })
    return
  }

  res.writeHead(200, {
    'content-type': 'text/event-stream',
    'cache-control': 'no-cache, no-transform',
    connection: 'keep-alive',
    // Nginx buffers SSE into uselessness without this.
    'x-accel-buffering': 'no',
  })

  const unsubscribe = subscribe(job, (event) => {
    res.write(`data: ${JSON.stringify(event)}\n\n`)
    if (event.type === 'done' || event.type === 'error') res.end()
  })

  // A finished job replays from the buffer and has nothing more to say.
  if (job.finished) res.end()

  req.on('close', unsubscribe)
})

app.patch('/api/projects/:id/format', (req, res) => {
  const job = getJob(req.params.id)
  if (!job) {
    res.status(404).json({ error: 'No such project' })
    return
  }

  const format = typeof req.body?.format === 'string' ? req.body.format : null
  if (!format) {
    res.status(400).json({ error: 'format is required' })
    return
  }

  setFormat(job, format)
  res.json({ ok: true })
})

/**
 * The plan the model produced — format, script, and shot list. This is
 * what the editor builds its timeline from, so it's readable on its own
 * rather than only reachable by replaying the event stream.
 */
app.get('/api/projects/:id/plan', (req, res) => {
  const job = getJob(req.params.id)
  if (!job) {
    res.status(404).json({ error: 'No such project' })
    return
  }
  if (!job.plan) {
    res.status(409).json({ error: 'Still planning', status: 'pending' })
    return
  }

  res.json({
    project_id: job.id,
    scene: job.scene,
    format: job.format ?? job.plan.format,
    reason: job.plan.reason,
    titles: job.plan.titles,
    script: job.plan.script,
    shots: job.plan.shots,
    accent: job.plan.accent,
    screenshot_url: job.screenshotUrl,
    /** False means the model was unavailable and this is the scripted cut. */
    from_model: job.plan.fromModel,
  })
})

/**
 * Renders the cut for a finished project. Props come from the job the
 * pipeline already built, so the MP4 matches what the editor previewed.
 * An explicit body overrides them — that's the editor's escape hatch.
 */
app.post('/api/projects/:id/render', (req, res) => {
  const job = getJob(req.params.id)
  if (!job) {
    res.status(404).json({ error: 'No such project' })
    return
  }

  // Fall back to what the planner wrote, so a bare POST renders the cut
  // the user just watched being planned. Shape mirrors `launchSchema`.
  const planned = job.scene && {
    brandName: job.scene.brandName,
    domain: job.scene.domain,
    ...(job.plan?.titles ?? {}),
    screenshotUrl: job.screenshotUrl ?? undefined,
    ...(job.plan ? { accent: job.plan.accent } : {}),
  }
  const parsed = sceneProps.safeParse(
    Object.keys(req.body ?? {}).length ? req.body : planned,
  )
  if (!parsed.success) {
    res.status(409).json({
      error: 'This project has no scene to render yet',
      detail: parsed.error.issues,
    })
    return
  }

  const renderId = randomUUID()
  startRender(renderId, parsed.data)
  res.status(202).json({ render_id: renderId })
})

app.get('/api/renders/:id', (req, res) => {
  const job = getRender(req.params.id)
  if (!job) {
    res.status(404).json({ error: 'No such render' })
    return
  }
  res.json({
    id: job.id,
    status: job.status,
    progress: job.progress,
    ...(job.error ? { error: job.error } : {}),
  })
})

app.get('/api/renders/:id/file', (req, res) => {
  const job = getRender(req.params.id)
  if (!job) {
    res.status(404).json({ error: 'No such render' })
    return
  }
  if (job.status !== 'done') {
    res.status(409).json({ error: `Render is ${job.status}`, status: job.status })
    return
  }
  res.download(job.file, 'launch.mp4')
})

app.listen(PORT, () => {
  console.log(`[agape] http://127.0.0.1:${PORT}`)
  // Warm webpack so the first Export isn't 10s slower than the rest.
  getBundle()
    .then(() => console.log('[agape] composition bundled, renders ready'))
    .catch((cause) => console.error('[agape] bundle failed:', cause))
})
