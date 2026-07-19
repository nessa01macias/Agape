import { delay } from '../hooks/useReveal'
import './HowItWorks.css'

const STEPS = [
  {
    n: '01',
    title: 'Drop your URL',
    body: 'Agape reads your site — what you sell, how you say it, the exact hex codes you use. No brand deck, no onboarding call.',
  },
  {
    n: '02',
    title: 'Say the edit out loud',
    body: '“Trim the dead air, add captions, make a vertical cut for Stories.” Plain language. No keyframes, no timeline, no 11pm scrubbing.',
  },
  {
    n: '03',
    title: 'Approve, then ship',
    body: 'It shows you the plan before a single frame renders. Change your mind, re-cut, export for every channel. Done before standup.',
  },
]

export function HowItWorks() {
  return (
    <section className="section how" id="how-it-works">
      <div className="container">
        <header className="how__head">
          <p className="eyebrow" data-reveal>
            How it works
          </p>
          <h2 className="section-title" data-reveal style={delay(60)}>
            Three steps. One of them is waiting.
          </h2>
          <p className="section-lede" data-reveal style={delay(120)}>
            The bottleneck was never taste or ideas — it's that turning “cut the
            dead air and add captions” into a rendered file takes hours of
            clicking. So don't click.
          </p>
        </header>

        <ol className="how__steps">
          {STEPS.map((step, i) => (
            <li
              className="how__step card"
              key={step.n}
              data-reveal
              style={delay(120 + i * 110)}
            >
              <span className="how__n">{step.n}</span>
              <h3 className="how__title">{step.title}</h3>
              <p className="how__body">{step.body}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  )
}
