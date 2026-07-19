/* ---------------------------------------------------------------
   Agape — the pipeline, as React state
   ---------------------------------------------------------------
   Owns one job: kicks it off, folds the event stream into something
   renderable, and hands back the Scene props the player needs.

   Everything downstream reads from here, so the pipeline screen and the
   editor stay in sync without either owning the socket.
   --------------------------------------------------------------- */

import { useEffect, useMemo, useReducer } from 'react'
import {
  createProject,
  subscribeToJob,
  type Artifact,
  type Job,
  type JobEvent,
  type StageId,
} from '../lib/jobs'
import { brandFromUrl } from '../lib/brand'
import type { LaunchProps } from '../remotion/LaunchTemplate'
import { DEFAULT_THEME } from '../remotion/theme'

/** Display order for the pipeline UI — the backend may emit out of order. */
export const STAGES: StageId[] = [
  'scout',
  'curator',
  'strategist',
  'writer',
  'director',
]

const STAGE_LABELS: Record<StageId, string> = {
  scout: 'Scout',
  curator: 'Curator',
  strategist: 'Strategist',
  writer: 'Writer',
  director: 'Director',
}

export type StageState = {
  id: StageId
  name: string
  status: 'idle' | 'working' | 'done'
  label: string | null
}

export type JobState = {
  job: Job | null
  /** `starting` covers the POST; `running` means events are flowing. */
  phase: 'starting' | 'running' | 'done' | 'error'
  progress: number
  stages: StageState[]
  logs: string[]
  artifacts: Artifact[]
  decision: { format: string; reason: string } | null
  script: string[]
  frames: { index: number; title: string }[]
  projectId: string | null
  error: string | null
}

const initialState: JobState = {
  job: null,
  phase: 'starting',
  progress: 0,
  stages: STAGES.map((id) => ({
    id,
    name: STAGE_LABELS[id],
    status: 'idle',
    label: null,
  })),
  logs: [],
  artifacts: [],
  decision: null,
  script: [],
  frames: [],
  projectId: null,
  error: null,
}

type Action =
  | { type: 'reset' }
  | { type: 'started'; job: Job }
  | { type: 'event'; event: JobEvent }

function reducer(state: JobState, action: Action): JobState {
  switch (action.type) {
    case 'reset':
      return initialState

    case 'started':
      return { ...state, job: action.job, phase: 'running' }

    case 'event':
      return applyEvent(state, action.event)
  }
}

function applyEvent(state: JobState, event: JobEvent): JobState {
  switch (event.type) {
    case 'stage':
      return {
        ...state,
        stages: state.stages.map((stage) =>
          stage.id === event.stage
            ? { ...stage, status: event.status, label: event.label }
            : stage,
        ),
      }

    case 'log':
      return { ...state, logs: [...state.logs, event.message] }

    case 'artifact':
      return { ...state, artifacts: [...state.artifacts, event.artifact] }

    case 'decision':
      return {
        ...state,
        decision: { format: event.format, reason: event.reason },
      }

    case 'script':
      return { ...state, script: [...state.script, event.line] }

    case 'frame':
      return { ...state, frames: [...state.frames, event] }

    case 'progress':
      // The stream can arrive out of order; never let the bar walk backwards.
      return { ...state, progress: Math.max(state.progress, event.value) }

    case 'done':
      return {
        ...state,
        phase: 'done',
        progress: 1,
        projectId: event.projectId,
        // A `done` with a stage still mid-flight would otherwise spin forever.
        stages: state.stages.map((stage) =>
          stage.status === 'working' ? { ...stage, status: 'done' } : stage,
        ),
      }

    case 'error':
      return { ...state, phase: 'error', error: event.message }
  }
}

export type UseJob = JobState & {
  /** What the player renders — the guess, refined by live artifacts. */
  scene: LaunchProps
  ready: boolean
}

/**
 * Runs the pipeline for `url`. Re-runs only when the url changes; the
 * cleanup cancels both the in-flight POST and the stream, so StrictMode's
 * double-mount in dev doesn't leave a second subscription behind.
 */
export function useJob(url: string): UseJob {
  const [state, dispatch] = useReducer(reducer, initialState)

  useEffect(() => {
    let cancelled = false
    let unsubscribe: (() => void) | undefined

    dispatch({ type: 'reset' })

    createProject(url)
      .then((job) => {
        if (cancelled) return
        dispatch({ type: 'started', job })
        unsubscribe = subscribeToJob(job, (event) => {
          if (!cancelled) dispatch({ type: 'event', event })
        })
      })
      .catch((cause: unknown) => {
        if (cancelled) return
        dispatch({
          type: 'event',
          event: { type: 'error', message: String(cause) },
        })
      })

    return () => {
      cancelled = true
      unsubscribe?.()
    }
  }, [url])

  const scene = useMemo<LaunchProps>(() => {
    const guess = brandFromUrl(url)

    // First colour the curator finds wins; the rest are supporting shades.
    const accent = state.artifacts.find((a) => a.kind === 'color')?.value
    const copy = state.artifacts.find((a) => a.kind === 'copy')?.value

    // Mock jobs emit a dedicated `screenshot`; the live pipeline's first
    // `image` artifact is the landing-page shot, URL in `src`.
    const screenshotUrl =
      state.artifacts.find((a) => a.kind === 'screenshot')?.value ??
      state.artifacts.find((a) => a.kind === 'image')?.src

    // The writer streams its three lines in render order — headline
    // (shot 1), tagline (shot 4), cta (shot 5). They land one at a time,
    // so the preview fills in as they arrive rather than waiting for the
    // whole plan.
    const [headlineLine, taglineLine, ctaLine] = state.script

    return {
      brandName: guess.name,
      domain: guess.domain,
      headline: headlineLine ?? 'Your launch deserves better.',
      tagline: taglineLine ?? copy ?? 'Something big is coming.',
      cta: ctaLine ?? 'Get early access',
      screenshotUrl,
      theme: {
        ...DEFAULT_THEME,
        colors: { ...DEFAULT_THEME.colors, accent: accent ?? guess.accent },
      },
    }
  }, [url, state.artifacts, state.script])

  return { ...state, scene, ready: state.phase === 'done' }
}
