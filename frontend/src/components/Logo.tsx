import type { CSSProperties } from 'react'
import './Logo.css'

type LogoProps = {
  /** Mark size in px; the wordmark scales alongside it. */
  size?: number
}

/** The Agape mark + wordmark, used in the nav and the footer. */
export function Logo({ size = 28 }: LogoProps) {
  return (
    <span className="logo" style={{ '--logo-size': `${size}px` } as CSSProperties}>
      <svg
        className="logo__mark"
        viewBox="0 0 32 32"
        role="img"
        aria-label="Agape"
      >
        <defs>
          <linearGradient id="agape-mark" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#a9ff67" />
            <stop offset="1" stopColor="#f4db5e" />
          </linearGradient>
        </defs>
        <path d="M16 6 26 26h-4.7L16 14.6 10.7 26H6Z" fill="url(#agape-mark)" />
        <path d="M11.7 19.5h8.6l1.7 3.4H10Z" fill="url(#agape-mark)" />
      </svg>
      <span className="logo__word">Agape</span>
    </span>
  )
}
