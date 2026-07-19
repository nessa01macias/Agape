import { useEffect, useState } from 'react'

const TYPE_MS = 68
const DELETE_MS = 32
const HOLD_MS = 1500

/**
 * Cycles through phrases, typing and deleting one character at a time.
 * Used for the hero's ghost placeholder — it stops the moment the user
 * starts typing (`active: false`) so it never fights real input.
 */
export function useTypewriter(phrases: string[], active = true): string {
  const [text, setText] = useState(phrases[0] ?? '')

  useEffect(() => {
    if (!active || phrases.length === 0) return

    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setText(phrases[0])
      return
    }

    // Start on a fully-typed phrase so the field never reads as empty,
    // then delete it and cycle.
    let phrase = 0
    let chars = phrases[0].length
    let deleting = true
    let timer: ReturnType<typeof setTimeout>

    setText(phrases[0])

    const step = () => {
      const current = phrases[phrase]
      chars += deleting ? -1 : 1
      setText(current.slice(0, chars))

      let wait: number = deleting ? DELETE_MS : TYPE_MS

      if (!deleting && chars === current.length) {
        deleting = true
        wait = HOLD_MS
      } else if (deleting && chars === 0) {
        deleting = false
        phrase = (phrase + 1) % phrases.length
        wait = 320
      }

      timer = setTimeout(step, wait)
    }

    timer = setTimeout(step, HOLD_MS)
    return () => clearTimeout(timer)
  }, [phrases, active])

  return text
}
