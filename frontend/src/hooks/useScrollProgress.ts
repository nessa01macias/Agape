import { useEffect, useRef, type RefObject } from 'react'

type Options = {
  /**
   * Where in the viewport progress hits 0 and 1, as a fraction of viewport
   * height. `[1, 0]` means: 0 when the element's top touches the bottom of the
   * viewport, 1 when its bottom touches the top.
   */
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

      // Distance travelled between the `from` and `to` anchor lines.
      const start = vh * from
      const end = -rect.height + vh * to
      const span = start - end || 1
      const progress = (start - rect.top) / span

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
  }, [from, to])

  return ref
}
