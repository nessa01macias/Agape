import { Logo } from './Logo'
import './Footer.css'

const LINKS = [
  { label: 'Pricing', href: '#pricing' },
  { label: 'Privacy', href: '#privacy' },
  { label: 'Terms', href: '#terms' },
  { label: 'Contact', href: '#contact' },
]

export function Footer() {
  return (
    <footer className="footer">
      <div className="container footer__inner">
        <Logo size={24} />

        <nav className="footer__links" aria-label="Footer">
          {LINKS.map((link) => (
            <a key={link.href} href={link.href}>
              {link.label}
            </a>
          ))}
        </nav>

        <span className="footer__copy">© {new Date().getFullYear()} Agape</span>
      </div>
    </footer>
  )
}
