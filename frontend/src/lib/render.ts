/* ---------------------------------------------------------------
   Agape — MP4 export
   ---------------------------------------------------------------
     POST /api/projects/:id/render -> { render_id }
     GET  /api/renders/:id         -> { status, progress }
     GET  /api/renders/:id/file    -> the MP4

   Rendering drives a real Chrome for every frame, so it's a job we poll
   rather than a request we wait on.
   --------------------------------------------------------------- */

import type { Job } from './jobs'

export type RenderStatus = {
  id: string
  status: 'queued' | 'rendering' | 'done' | 'error'
  progress: number
  error?: string
}

/**
 * Kicks off a render. `props` are the scene as it stands in the editor —
 * inspector edits included — so the MP4 matches what's on screen rather
 * than whatever the pipeline originally guessed.
 */
export async function startRender(
  job: Job,
  props: { brandName: string; domain: string } & Record<string, unknown>,
): Promise<string> {
  const response = await fetch(`/api/projects/${job.id}/render`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(props),
  })

  if (!response.ok) {
    const detail = await response.json().catch(() => null)
    throw new Error(detail?.error ?? `Couldn't start the render (${response.status})`)
  }

  const data: { render_id?: string } = await response.json()
  if (!data.render_id) throw new Error('Render started but returned no id')
  return data.render_id
}

export async function getRenderStatus(id: string): Promise<RenderStatus> {
  const response = await fetch(`/api/renders/${id}`)
  if (!response.ok) throw new Error(`Lost track of the render (${response.status})`)
  return (await response.json()) as RenderStatus
}

export function renderFileUrl(id: string): string {
  return `/api/renders/${id}/file`
}
