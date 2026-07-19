import { useEffect, useRef, type RefObject } from 'react'

type Options = {
  /**
   * `travel` — 0 when the element's top reaches the bottom of the viewport,
   * 1 when its bottom passes the top. Good for parallax on normal blocks.
   *
   * `sticky` — 0 when the element's top hits the top of the viewport, 1 when
   * its bottom hits the bottom. That is exactly the range over which a
   * `position: sticky` child stays pinned, so a scrubbed sequence finishes on
   * the last pinned frame instead of after the panel has already scrolled away.
   */
  mode?: 'travel' | 'sticky'
  /** `travel` only: viewport-height fractions for the 0 and 1 anchor lines. */
  from?: number
  to?: number
}

/**
 * Writes the element's scroll progress (0 → 1) into a `--progress` CSS custom
 * property so animation stays in CSS and never re-renders React.
 *
 * The rAF loop only runs while the element is on screen, so an off-screen
 * section costs nothing.
 */
export function useScrollProgress<T extends HTMLElement>({
  mode = 'travel',
  from = 1,
  to = 0,
}: Options = {}): RefObject<T | null> {
  const ref = useRef<T>(null)

  useEffect(() => {
    const el = ref.current
    if (!el) return

    let frame = 0
    let running = false

    const measure = () => {
      const rect = el.getBoundingClientRect()
      const vh = window.innerHeight || 1
      let progress: number

      if (mode === 'sticky') {
        // The pinned range: from top-aligned until the bottom edge arrives.
        const span = rect.height - vh || 1
        progress = -rect.top / span
      } else {
        // Distance travelled between the `from` and `to` anchor lines.
        const start = vh * from
        const end = -rect.height + vh * to
        const span = start - end || 1
        progress = (start - rect.top) / span
      }

      el.style.setProperty('--progress', String(Math.min(1, Math.max(0, progress))))
    }

    const tick = () => {
      measure()
      if (running) frame = requestAnimationFrame(tick)
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !running) {
          running = true
          frame = requestAnimationFrame(tick)
        } else if (!entry.isIntersecting && running) {
          running = false
          cancelAnimationFrame(frame)
          measure() // settle on the final value at the edge
        }
      },
      { threshold: 0 },
    )

    observer.observe(el)
    measure()

    return () => {
      observer.disconnect()
      running = false
      cancelAnimationFrame(frame)
    }
  }, [mode, from, to])

  return ref
}
