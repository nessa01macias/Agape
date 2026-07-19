import { useState, type FormEvent } from 'react'
import { delay } from '../hooks/useReveal'
import './Hero.css'

/** Accepts `acme.com`, `www.acme.com`, `https://acme.com/launch` … */
function normalizeUrl(raw: string): string | null {
  const trimmed = raw.trim()
  if (!trimmed) return null

  const withScheme = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`

  try {
    const url = new URL(withScheme)
    // A bare word like "launch" parses fine but isn't a site.
    if (!/^[\w-]+(\.[\w-]+)+$/.test(url.hostname)) return null
    return url.toString()
  } catch {
    return null
  }
}

type HeroProps = {
  onAnalyze: (url: string) => void
}

export function Hero({ onAnalyze }: HeroProps) {
  const [value, setValue] = useState('')
  const [error, setError] = useState<string | null>(null)

  function handleSubmit(event: FormEvent) {
    event.preventDefault()
    const url = normalizeUrl(value)

    if (!url) {
      setError("That doesn't look like a website — try acme.com")
      return
    }

    setError(null)
    onAnalyze(url)
  }

  return (
    <section className="hero" id="top">
      <div className="hero__bg" aria-hidden="true">
        <span className="hero__glow hero__glow--teal" />
        <span className="hero__glow hero__glow--lime" />
        <span className="hero__grid" />
      </div>

      <div className="hero__inner container">
        <p className="hero__badge" data-reveal>
          <span className="hero__dot" />
          Agentic video editing — now in early access
        </p>

        <h1 className="hero__title" data-reveal style={delay(80)}>
          Late for tomorrow's launch?
          <span className="hero__title-accent">We are here to help.</span>
        </h1>

        <p
          className="hero__lede"
          data-reveal
          style={delay(160)}
        >
          Drop your website. Agape reads your product, your colors, and your
          voice — then cuts the launch video, the vertical teaser, and the ad
          variants while you finish the release notes.
        </p>

        <form
          className="hero__form"
          onSubmit={handleSubmit}
          data-reveal
          style={delay(240)}
          noValidate
        >
          <div className={`hero__field ${error ? 'has-error' : ''}`}>
            <svg className="hero__field-icon" viewBox="0 0 24 24" aria-hidden="true">
              <circle cx="12" cy="12" r="9" />
              <path d="M3.5 12h17M12 3a15 15 0 0 1 0 18a15 15 0 0 1 0-18" />
            </svg>

            <input
              type="text"
              inputMode="url"
              autoComplete="url"
              spellCheck={false}
              placeholder="Paste your website — acme.com"
              aria-label="Your website URL"
              aria-invalid={Boolean(error)}
              value={value}
              onChange={(event) => {
                setValue(event.target.value)
                if (error) setError(null)
              }}
            />

            <button type="submit" className="btn btn--primary hero__submit">
              <svg viewBox="0 0 24 24" aria-hidden="true" className="hero__spark">
                <path d="M12 3.5 13.9 9 19.5 11l-5.6 2L12 18.5 10.1 13 4.5 11 10.1 9z" />
                <path d="M18.5 3.5 19.2 5.6 21.2 6.3 19.2 7 18.5 9 17.8 7 15.8 6.3 17.8 5.6z" />
              </svg>
              Make my video
            </button>
          </div>

          <p className="hero__error" role="alert">
            {error}
          </p>
        </form>

        <p
          className="hero__note"
          data-reveal
          style={delay(320)}
        >
          No timeline. No credit card. First cut in about four minutes.
        </p>
      </div>

      <a className="hero__scroll" href="#how-it-works" aria-label="Keep scrolling">
        <span />
      </a>
    </section>
  )
}
