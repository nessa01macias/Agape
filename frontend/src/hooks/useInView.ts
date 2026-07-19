import { useEffect, useRef, useState, type RefObject } from 'react'

type Options = {
  /** Fire once and stop observing. Default true — reveals shouldn't replay. */
  once?: boolean
  /** Fraction of the element that must be visible. */
  threshold?: number
  rootMargin?: string
}

/** Tracks whether an element has entered the viewport. */
export function useInView<T extends HTMLElement>({
  once = true,
  threshold = 0.15,
  rootMargin = '0px 0px -10% 0px',
}: Options = {}): [RefObject<T | null>, boolean] {
  const ref = useRef<T>(null)
  const [inView, setInView] = useState(false)

  useEffect(() => {
    const el = ref.current
    if (!el) return

    if (!('IntersectionObserver' in window)) {
      setInView(true)
      return
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setInView(true)
          if (once) observer.disconnect()
        } else if (!once) {
          setInView(false)
        }
      },
      { threshold, rootMargin },
    )

    observer.observe(el)
    return () => observer.disconnect()
  }, [once, threshold, rootMargin])

  return [ref, inView]
}
