import { useEffect, useRef, type RefObject } from 'react'

/**
 * Tracks the pointer across an element and writes its position as `--px` /
 * `--py` (percentages) plus `--lit` (0 → 1 proximity fade). CSS uses these to
 * put a specular highlight under the cursor.
 *
 * Coalesced through rAF so a fast pointer can't outrun the paint.
 */
export function usePointerLight<T extends HTMLElement>(): RefObject<T | null> {
  const ref = useRef<T>(null)

  useEffect(() => {
    const el = ref.current
    if (!el) return

    // Touch devices have no hover — the highlight would stick where you tapped.
    if (!window.matchMedia('(hover: hover) and (pointer: fine)').matches) return

    let frame = 0
    let px = 50
    let py = 50

    const paint = () => {
      frame = 0
      el.style.setProperty('--px', `${px}%`)
      el.style.setProperty('--py', `${py}%`)
    }

    const onMove = (event: PointerEvent) => {
      const rect = el.getBoundingClientRect()
      px = ((event.clientX - rect.left) / rect.width) * 100
      py = ((event.clientY - rect.top) / rect.height) * 100
      if (!frame) frame = requestAnimationFrame(paint)
    }

    const onEnter = () => el.style.setProperty('--lit', '1')
    const onLeave = () => el.style.setProperty('--lit', '0')

    el.addEventListener('pointermove', onMove)
    el.addEventListener('pointerenter', onEnter)
    el.addEventListener('pointerleave', onLeave)

    return () => {
      el.removeEventListener('pointermove', onMove)
      el.removeEventListener('pointerenter', onEnter)
      el.removeEventListener('pointerleave', onLeave)
      cancelAnimationFrame(frame)
    }
  }, [])

  return ref
}
