import type { ReactNode } from 'react'
import { delay } from '../hooks/useReveal'
import './Features.css'

type Feature = {
  title: string
  body: string
  icon: ReactNode
  wide?: boolean
}

const FEATURES: Feature[] = [
  {
    title: 'It knows your brand already',
    body: 'Type, color, tone of voice — pulled straight off your site the moment you paste the URL. The first cut already looks like you.',
    wide: true,
    icon: (
      <>
        <path d="M4 7h16M4 12h10M4 17h7" />
        <circle cx="18.5" cy="16.5" r="3.5" />
      </>
    ),
  },
  {
    title: 'Every aspect ratio',
    body: '16:9, 9:16, 1:1 — one timeline, subject tracked in each.',
    icon: (
      <>
        <rect x="3" y="6" width="12" height="9" rx="2" />
        <rect x="16" y="9" width="5" height="11" rx="2" />
      </>
    ),
  },
  {
    title: 'Captions that keep up',
    body: 'Word-level timing, styled to match. Nobody watches with sound on.',
    icon: (
      <>
        <rect x="3" y="5" width="18" height="14" rx="3" />
        <path d="M8 13h3M13.5 13h3" />
      </>
    ),
  },
  {
    title: 'Twelve hooks, one prompt',
    body: "You don't know which opener lands. Ship all of them and find out.",
    icon: (
      <>
        <path d="M7 4h10M5.5 8h13" />
        <rect x="4" y="11" width="16" height="9" rx="2" />
      </>
    ),
  },
  {
    title: 'Nothing is final',
    body: 'Every cut stays editable. Argue with it, re-render, keep the good take.',
    icon: (
      <>
        <path d="M4 12a8 8 0 0 1 13.7-5.7L21 9" />
        <path d="M21 4v5h-5" />
        <path d="M20 12a8 8 0 0 1-13.7 5.7L3 15" />
        <path d="M3 20v-5h5" />
      </>
    ),
  },
]

export function Features() {
  return (
    <section className="section features" id="features">
      <div className="container">
        <header className="features__head">
          <p className="eyebrow" data-reveal>
            Features
          </p>
          <h2 className="section-title" data-reveal style={delay(60)}>
            Built for the week before launch.
          </h2>
        </header>

        <div className="features__grid">
          {FEATURES.map((feature, i) => (
            <article
              className={`feature card ${feature.wide ? 'feature--wide' : ''}`}
              key={feature.title}
              data-reveal
              style={delay(80 + i * 80)}
            >
              <svg className="feature__icon" viewBox="0 0 24 24" aria-hidden="true">
                {feature.icon}
              </svg>
              <h3 className="feature__title">{feature.title}</h3>
              <p className="feature__body">{feature.body}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  )
}
