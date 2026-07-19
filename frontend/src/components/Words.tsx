import type { CSSProperties } from 'react'
import { useInView } from '../hooks/useInView'

type WordsProps = {
  /** The line to animate. Split on spaces; each word rises out of a blur. */
  children: string
  className?: string
  /** Extra ms before the first word moves. */
  delay?: number
  /** Skip the observer and reveal immediately (hero, above the fold). */
  immediate?: boolean
}

/**
 * Staggered word reveal. The stagger lives in CSS (`--i` per word), so the
 * whole line animates off one class flip instead of per-word React state.
 * Render it inside whatever heading you need — it's an inline span.
 */
export function Words({
  children,
  className = '',
  delay = 0,
  immediate = false,
}: WordsProps) {
  const [ref, inView] = useInView<HTMLSpanElement>()
  const revealed = immediate || inView

  return (
    <span
      ref={ref}
      className={`words ${revealed ? 'is-revealed' : ''} ${className}`}
      style={{ '--delay': `${delay}ms` } as CSSProperties}
    >
      {children.split(' ').map((word, i) => (
        <span
          className="words__w"
          key={`${word}-${i}`}
          style={{ '--i': i } as CSSProperties}
        >
          {i === 0 ? word : ` ${word}`}
        </span>
      ))}
    </span>
  )
}
