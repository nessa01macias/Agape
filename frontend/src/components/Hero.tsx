import { useMemo, useState, type FormEvent } from 'react'
import { usePointerLight } from '../hooks/usePointerLight'
import { useTypewriter } from '../hooks/useTypewriter'
import { Words } from './Words'
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
  const lightRef = usePointerLight<HTMLElement>()

  const phrases = useMemo(
    () => ['linear.app', 'yourstartup.com', 'acme.io', 'notion.so'],
    [],
  )
  const ghost = useTypewriter(phrases, value === '')

  function handleSubmit(event: FormEvent) {
    event.preventDefault()
    const url = normalizeUrl(value)

    if (!url) {
      setError('Needs to look like a website — try acme.com')
      return
    }

    setError(null)
    onAnalyze(url)
  }

  return (
    <section className="hero" id="top" ref={lightRef}>
      <div className="hero__bg" aria-hidden="true">
        <span className="hero__halo" />
        <span className="hero__beam" />
        <span className="hero__grid" />
      </div>

      <div className="hero__inner container">
        <p className="kicker hero__kicker">Agentic video editor</p>

        <h1 className="hero__title">
          <Words className="bloom hero__line" immediate delay={120}>
            Late for tomorrow's launch?
          </Words>
          <Words className="bloom--teal hero__line" immediate delay={520}>
            We are here to help.
          </Words>
        </h1>

        <form className="hero__form" onSubmit={handleSubmit} noValidate>
          <div className={`hero__field ${error ? 'has-error' : ''}`}>
            <span className="hero__scheme" aria-hidden="true">
              https://
            </span>

            <span className="hero__entry">
              <input
                type="text"
                inputMode="url"
                autoComplete="url"
                spellCheck={false}
                aria-label="Your website URL"
                aria-invalid={Boolean(error)}
                value={value}
                onChange={(event) => {
                  setValue(event.target.value)
                  if (error) setError(null)
                }}
              />
              {value === '' && (
                <span className="hero__ghost" aria-hidden="true">
                  {ghost}
                  <i className="hero__caret" />
                </span>
              )}
            </span>

            <button type="submit" className="btn btn--primary hero__submit">
              Make the video
            </button>
          </div>

          <p className="hero__note" role={error ? 'alert' : undefined}>
            {error ?? 'One link. Four minutes. No timeline.'}
          </p>
        </form>
      </div>
    </section>
  )
}
