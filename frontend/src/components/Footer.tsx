import { Link } from 'react-router-dom'
import { Logo } from './Logo'
import './Footer.css'

/**
 * The team's LinkedIn profiles — this is how people reach us.
 * `handle` is the profile slug; swap in display names when we want them shown.
 */
const TEAM = [
  { handle: 'melanymacias', url: 'https://www.linkedin.com/in/melanymacias/' },
  { handle: 'tranchitai', url: 'https://www.linkedin.com/in/tranchitai/' },
  { handle: 'kattch', url: 'https://www.linkedin.com/in/kattch/' },
  {
    handle: 'vili-haapaniemi',
    url: 'https://www.linkedin.com/in/vili-haapaniemi-96b324227/',
  },
  { handle: 'zeyualicepeng', url: 'https://www.linkedin.com/in/zeyualicepeng/' },
]

export function Footer() {
  return (
    <footer className="footer">
      <div className="container footer__inner">
        <div className="footer__brand">
          <Logo size={24} />
          <span className="footer__copy">© {new Date().getFullYear()} Agape</span>
        </div>

        <nav className="footer__links" aria-label="Footer">
          <a href="#pricing">Pricing</a>
          <Link to="/privacy">Privacy</Link>
          <Link to="/terms">Terms</Link>
        </nav>

        <div className="footer__team">
          <span className="footer__team-label">Talk to us</span>
          <ul>
            {TEAM.map((person) => (
              <li key={person.url}>
                <a
                  href={person.url}
                  target="_blank"
                  rel="noreferrer noopener"
                  title={person.handle}
                  aria-label={`${person.handle} on LinkedIn`}
                >
                  <svg viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M6.94 5a1.94 1.94 0 1 1-3.88 0 1.94 1.94 0 0 1 3.88 0ZM3.3 8.4h3.4V20H3.3V8.4Zm5.9 0h3.26v1.58h.05c.45-.86 1.56-1.77 3.22-1.77 3.44 0 4.08 2.27 4.08 5.22V20h-3.4v-5.87c0-1.4-.02-3.2-1.95-3.2-1.95 0-2.25 1.53-2.25 3.1V20H9.2V8.4Z" />
                  </svg>
                </a>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </footer>
  )
}
