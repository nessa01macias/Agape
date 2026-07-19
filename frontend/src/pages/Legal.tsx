import { Link } from 'react-router-dom'
import { Logo } from '../components/Logo'
import './Legal.css'

type LegalProps = {
  kind: 'privacy' | 'terms'
}

const COPY = {
  privacy: {
    title: 'Privacy',
    lede: "We're writing this properly before general availability.",
    body: [
      'Agape is in early access. Today the product reads the public web page at the URL you give us so it can build your video, and stores the project you create.',
      'The full policy — what we keep, for how long, and how to have it deleted — lands here before we open to the public.',
    ],
  },
  terms: {
    title: 'Terms',
    lede: "We're writing this properly before general availability.",
    body: [
      'Agape is in early access and provided as-is while we build it. You keep the rights to the videos you make and to the material you bring.',
      'The full terms land here before we open to the public.',
    ],
  },
} as const

export function Legal({ kind }: LegalProps) {
  const { title, lede, body } = COPY[kind]

  return (
    <main className="legal">
      <div className="legal__inner container">
        <Link className="legal__brand" to="/" aria-label="Agape — home">
          <Logo size={26} />
        </Link>

        <h1 className="legal__title bloom">{title}</h1>
        <p className="legal__lede">{lede}</p>

        {body.map((paragraph) => (
          <p className="legal__body" key={paragraph}>
            {paragraph}
          </p>
        ))}

        <Link className="btn btn--ghost legal__back" to="/">
          ← Back to Agape
        </Link>
      </div>
    </main>
  )
}
