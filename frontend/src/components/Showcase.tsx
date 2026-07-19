import { delay } from '../hooks/useReveal'
import './Showcase.css'

const PLAN = [
  { label: 'Trimmed 00:00–00:19 (dead air, mic bump)', state: 'done' },
  { label: 'Sped the walkthrough 1.4× between 01:02–02:40', state: 'done' },
  { label: 'Captions burned in — Poppins Semibold, brand lime', state: 'active' },
  { label: 'Re-framed to 9:16, subject tracked', state: 'todo' },
  { label: 'Export: 16:9 master, 9:16 Stories, 1:1 feed', state: 'todo' },
] as const

/** Deterministic waveform — no Math.random so SSR/re-renders stay stable. */
const WAVE = Array.from({ length: 56 }, (_, i) => {
  const h = Math.abs(Math.sin(i * 0.7) * 0.6 + Math.sin(i * 0.23) * 0.4)
  return Math.round(18 + h * 82)
})

const CLIPS = [
  { width: 14, tone: 'dim', label: 'intro' },
  { width: 32, tone: 'lime', label: 'demo' },
  { width: 22, tone: 'teal', label: 'b-roll' },
  { width: 18, tone: 'yellow', label: 'cta' },
  { width: 14, tone: 'dim', label: 'end' },
]

export function Showcase() {
  return (
    <section className="section showcase" id="editor">
      <div className="container">
        <header className="showcase__head">
          <p className="eyebrow" data-reveal>
            The editor
          </p>
          <h2 className="section-title" data-reveal style={delay(60)}>
            It proposes. You approve.
          </h2>
          <p className="section-lede" data-reveal style={delay(120)}>
            Agape never renders behind your back. Every edit arrives as a plan
            you can read, argue with, and change — then it does the work.
          </p>
        </header>

        <div className="window" data-reveal style={delay(160)}>
          <div className="window__bar">
            <span className="window__dots" aria-hidden="true">
              <i />
              <i />
              <i />
            </span>
            <span className="window__file">launch-teaser · draft 3</span>
            <span className="window__badge">rendering 62%</span>
          </div>

          <div className="window__body">
            {/* left: the conversation */}
            <div className="chat">
              <div className="chat__msg chat__msg--user">
                Cut the dead air at the top, speed up the middle, caption it, and
                give me a vertical for Stories.
              </div>

              <div className="chat__agent">
                <span className="chat__who">
                  <span className="chat__avatar" aria-hidden="true" />
                  Agape
                </span>
                <p className="chat__intro">Here's the plan — say the word.</p>

                <ul className="plan">
                  {PLAN.map((item) => (
                    <li className={`plan__item is-${item.state}`} key={item.label}>
                      <span className="plan__tick" aria-hidden="true" />
                      {item.label}
                    </li>
                  ))}
                </ul>

                <div className="chat__actions">
                  <span className="chat__btn chat__btn--go">Render it</span>
                  <span className="chat__btn">Change something</span>
                </div>
              </div>
            </div>

            {/* right: preview + timeline */}
            <div className="preview">
              <div className="preview__frame">
                <div className="preview__poster" aria-hidden="true" />
                <span className="preview__play" aria-hidden="true" />
                <span className="preview__caption">
                  ship the thing <b>tonight</b>
                </span>
                <span className="preview__ratio">16:9 · 1080p</span>
              </div>

              <div className="timeline" aria-hidden="true">
                <div className="timeline__clips">
                  {CLIPS.map((clip) => (
                    <span
                      key={clip.label}
                      className={`clip clip--${clip.tone}`}
                      style={{ flexGrow: clip.width }}
                    >
                      {clip.label}
                    </span>
                  ))}
                </div>

                <div className="timeline__wave">
                  {WAVE.map((h, i) => (
                    <i key={i} style={{ height: `${h}%` }} />
                  ))}
                </div>

                <span className="timeline__head" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
