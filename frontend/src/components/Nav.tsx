import { useEffect, useState } from 'react'
import { Logo } from './Logo'
import './Nav.css'

const LINKS = [
  { label: 'How it works', href: '#how' },
  { label: 'What you get', href: '#what' },
  { label: 'Pricing', href: '#pricing' },
]

export function Nav() {
  const [scrolled, setScrolled] = useState(false)
  const [open, setOpen] = useState(false)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <header className={`nav ${scrolled ? 'is-scrolled' : ''}`}>
      <div className="nav__inner container">
        <a className="nav__brand" href="#top" aria-label="Agape — home">
          <Logo />
        </a>

        <nav className="nav__links" aria-label="Main">
          {LINKS.map((link) => (
            <a key={link.href} href={link.href}>
              {link.label}
            </a>
          ))}
        </nav>

        <div className="nav__actions">
          <a className="nav__signin" href="#signin">
            Sign in
          </a>
          <a className="btn btn--primary" href="#start">
            Start free
          </a>
        </div>

        <button
          type="button"
          className="nav__toggle"
          aria-expanded={open}
          aria-controls="nav-mobile"
          aria-label={open ? 'Close menu' : 'Open menu'}
          onClick={() => setOpen((v) => !v)}
        >
          <span className={`nav__bars ${open ? 'is-open' : ''}`} />
        </button>
      </div>

      <div
        id="nav-mobile"
        className={`nav__mobile ${open ? 'is-open' : ''}`}
        hidden={!open}
      >
        {LINKS.map((link) => (
          <a key={link.href} href={link.href} onClick={() => setOpen(false)}>
            {link.label}
          </a>
        ))}
        <a href="#signin" onClick={() => setOpen(false)}>
          Sign in
        </a>
        <a
          className="btn btn--primary"
          href="#start"
          onClick={() => setOpen(false)}
        >
          Start free
        </a>
      </div>
    </header>
  )
}
