/* ---------------------------------------------------------------
   Agape — export state
   ---------------------------------------------------------------
   Owns one export: start it, poll it, hand back a downloadable URL.
   Polling (rather than another SSE stream) is deliberate — a render is
   a handful of status checks over ~30s, not a live narration.
   --------------------------------------------------------------- */

import { useCallback, useEffect, useRef, useState } from 'react'
import type { Job } from '../lib/jobs'
import { getRenderStatus, renderFileUrl, startRender } from '../lib/render'

const POLL_MS = 1500

export type ExportState =
  | { phase: 'idle' }
  | { phase: 'starting' }
  | { phase: 'rendering'; progress: number }
  | { phase: 'done'; url: string }
  | { phase: 'error'; message: string }

export function useRender(
  job: Job | null,
  props: { brandName: string; domain: string; accent: string },
) {
  const [state, setState] = useState<ExportState>({ phase: 'idle' })
  const timer = useRef<number | undefined>(undefined)
  const live = useRef(true)

  // Held in a ref so editing the brand in the inspector doesn't rebuild
  // `start` on every keystroke — the render reads it once, on click.
  const latest = useRef(props)
  latest.current = props

  useEffect(() => {
    live.current = true
    return () => {
      live.current = false
      window.clearTimeout(timer.current)
    }
  }, [])

  // A different project means the previous export no longer applies.
  useEffect(() => {
    setState({ phase: 'idle' })
    window.clearTimeout(timer.current)
  }, [job?.id])

  const start = useCallback(async () => {
    if (!job) return

    setState({ phase: 'starting' })

    try {
      const id = await startRender(job, latest.current)

      const poll = async () => {
        if (!live.current) return

        try {
          const status = await getRenderStatus(id)
          if (!live.current) return

          if (status.status === 'done') {
            setState({ phase: 'done', url: renderFileUrl(id) })
            return
          }
          if (status.status === 'error') {
            setState({ phase: 'error', message: status.error ?? 'The render failed.' })
            return
          }

          setState({ phase: 'rendering', progress: status.progress })
          timer.current = window.setTimeout(poll, POLL_MS)
        } catch (cause) {
          if (!live.current) return
          setState({ phase: 'error', message: String(cause) })
        }
      }

      void poll()
    } catch (cause) {
      if (!live.current) return
      setState({
        phase: 'error',
        message: cause instanceof Error ? cause.message : String(cause),
      })
    }
  }, [job])

  return { state, start }
}
