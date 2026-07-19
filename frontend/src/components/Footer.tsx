import { Logo } from './Logo'
import './Footer.css'

const COLUMNS = [
  {
    title: 'Product',
    links: [
      { label: 'How it works', href: '#how-it-works' },
      { label: 'The editor', href: '#editor' },
      { label: 'Features', href: '#features' },
      { label: 'Pricing', href: '#pricing' },
    ],
  },
  {
    title: 'Company',
    links: [
      { label: 'About', href: '#about' },
      { label: 'Careers', href: '#careers' },
      { label: 'Contact', href: '#contact' },
    ],
  },
  {
    title: 'Legal',
    links: [
      { label: 'Privacy', href: '#privacy' },
      { label: 'Terms', href: '#terms' },
    ],
  },
]

export function Footer() {
  return (
    <footer className="footer">
      <div className="container footer__inner">
        <div className="footer__brand">
          <Logo size={26} />
          <p className="footer__tagline">
            An agentic AI video editor. Describe the edit in plain language — it
            does the work.
          </p>
        </div>

        <nav className="footer__cols" aria-label="Footer">
          {COLUMNS.map((col) => (
            <div className="footer__col" key={col.title}>
              <h3 className="footer__col-title">{col.title}</h3>
              <ul>
                {col.links.map((link) => (
                  <li key={link.label}>
                    <a href={link.href}>{link.label}</a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </nav>
      </div>

      <div className="container footer__base">
        <span>© {new Date().getFullYear()} Agape</span>
        <span className="footer__made">Made for the night before launch</span>
      </div>
    </footer>
  )
}
