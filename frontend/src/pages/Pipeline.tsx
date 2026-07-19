/* ---------------------------------------------------------------
   Agape — the pipeline screen
   ---------------------------------------------------------------
   The only proof of intelligence the user gets before a video exists,
   so it does three jobs: show that we read *their* site, make the wait
   feel like labour rather than a stall, and teach the editor's
   vocabulary before they get there.

   Three acts, driven entirely by the event stream:

     I   READ    their site, scanned — artifacts drop out of it
     II  TURN    the site collapses into clips on a timeline
     III BUILD   the shots get assembled, ending on a poster

   The turn happens on the `decision` event, which is also the one beat
   where everything else stops. Nothing here is invented: the frames,
   the script lines and the accent colour are the same ones the Remotion
   scene renders, so the user recognises every shot when it plays.
   --------------------------------------------------------------- */

import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Logo } from '../components/Logo'
import { useJob } from '../hooks/useJob'
import { setProjectFormat, type Artifact } from '../lib/jobs'
import './Pipeline.css'

/** How long the decision holds the screen before the build resumes. */
const BEAT_MS = 2600

/** Formats the user can redirect to. Mock-only until the backend lands. */
const ALTERNATIVES = [
  'Product demo — 30s, 16:9',
  'Vertical teaser — 15s, 9:16',
  'Feature tour — 45s, 16:9',
]

/** Deterministic waveform — matches the Showcase mock, no Math.random. */
const WAVE = Array.from({ length: 64 }, (_, i) => {
  const h = Math.abs(Math.sin(i * 0.7) * 0.6 + Math.sin(i * 0.23) * 0.4)
  return Math.round(16 + h * 84)
})

const CLIP_TONES = ['teal', 'lime', 'yellow', 'dim'] as const

function useElapsed(running: boolean): string {
  const [seconds, setSeconds] = useState(0)

  useEffect(() => {
    if (!running) return
    const id = setInterval(() => setSeconds((s) => s + 1), 1000)
    return () => clearInterval(id)
  }, [running])

  const mm = String(Math.floor(seconds / 60)).padStart(2, '0')
  const ss = String(seconds % 60).padStart(2, '0')
  return `${mm}:${ss}`
}

export function Pipeline() {
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const url = params.get('url') ?? ''

  const job = useJob(url)
  const { phase, progress, stages, logs, artifacts, decision, script, frames } =
    job

  const elapsed = useElapsed(phase === 'starting' || phase === 'running')

  // A URL is the whole point of this screen — without one there's nothing
  // to read, so bounce rather than sit on an empty pipeline.
  useEffect(() => {
    if (!url) navigate('/', { replace: true })
  }, [url, navigate])

  // The decision holds the screen, then hands it back to the build.
  const [beat, setBeat] = useState(false)
  const [format, setFormat] = useState<string | null>(null)
  const [picking, setPicking] = useState(false)

  useEffect(() => {
    if (!decision) return
    setFormat(decision.format)
    setBeat(true)
  }, [decision])

  // Auto-dismiss — but hold the beat open while they're browsing formats,
  // otherwise the menu closes under their cursor.
  useEffect(() => {
    if (!beat || picking) return
    const id = setTimeout(() => setBeat(false), BEAT_MS)
    return () => clearTimeout(id)
  }, [beat, picking])

  // The turn waits for the beat to lift. Otherwise the site collapses into
  // clips behind the overlay and nobody ever sees it — which would waste
  // the one second that explains what this product does.
  const act: 'read' | 'build' | 'done' =
    phase === 'done' ? 'done' : decision && !beat ? 'build' : 'read'

  /**
   * The first rendered page shot the curator sends back. Only screenshots
   * carry `src`; the hero-image artifact is a filename with nothing behind
   * it, so that field is what separates them.
   */
  const shot = useMemo(
    () => artifacts.find((a) => a.kind === 'image' && a.src)?.src ?? null,
    [artifacts],
  )

  /**
   * Their own imagery, in arrival order. The first entry is the rendered
   * page shot standing in for the site itself, so the reel and the
   * storyboard take everything after it — otherwise the first frame of
   * the film is a screenshot of a webpage.
   */
  const footage = useMemo(() => {
    const all = artifacts
      .filter((a) => a.kind === 'image' && a.src)
      .map((a) => a.src as string)
    return all.slice(1)
  }, [artifacts])

  const clips = useMemo(() => {
    if (!frames.length) return []
    return frames.map((frame, i) => ({
      key: frame.index,
      title: frame.title,
      tone: CLIP_TONES[i % CLIP_TONES.length],
      // Widths that read as an edit, not a bar chart.
      grow: [26, 34, 22, 18][i % 4],
    }))
  }, [frames])

  if (phase === 'error') {
    return (
      <div className="pipe pipe--error">
        <div className="pipe__fail">
          <h1>That one got away.</h1>
          <p>{job.error}</p>
          <button
            type="button"
            className="btn btn--primary"
            onClick={() => navigate('/')}
          >
            Try another site
          </button>
        </div>
      </div>
    )
  }

  return (
    <div
      className={`pipe is-${act}`}
      style={{ '--accent': job.scene.theme.colors.accent } as React.CSSProperties}
      data-beat={beat ? 'true' : undefined}
    >
      <div className="pipe__bg" aria-hidden="true">
        <span className="pipe__glow pipe__glow--teal" />
        <span className="pipe__glow pipe__glow--lime" />
        <span className="pipe__grid" />
      </div>

      <div
        className="pipe__rail"
        style={{ '--p': progress } as React.CSSProperties}
        aria-hidden="true"
      />

      <header className="pipe__top">
        <a href="/" aria-label="Agape — back to home">
          <Logo size={24} />
        </a>
        <span className="pipe__host">{job.scene.domain}</span>
        {format && !beat && <span className="pipe__format">{format}</span>}
        <span className="pipe__clock" aria-hidden="true">
          {elapsed}
        </span>
      </header>

      <div className="pipe__grid-main">
        <div className="window pipe__window">
          <div className="window__bar">
            <span className="window__dots" aria-hidden="true">
              <i />
              <i />
              <i />
            </span>
            <span className="window__file">
              {job.scene.brandName}-launch ·{' '}
              {act === 'done' ? 'final cut' : 'assembling'}
            </span>
            <span
              className={`window__badge ${act === 'done' ? 'is-idle' : ''}`}
            >
              {act === 'done'
                ? 'ready'
                : `${Math.round(progress * 100)}% · ${
                    stages.find((s) => s.status === 'working')?.label ??
                    'starting up'
                  }`}
            </span>
          </div>

          <div className="pipe__stage">
            {/* Everything the agents make lands here, centred, so the
                stage never shows a hole between the site falling away
                and the first frame arriving. */}
            <div className="pipe__canvas">
            {/* ACT I — their site, read. The wireframe is a placeholder for
                  the seconds before the scraper answers; the moment a real
                  rendered shot arrives it takes over, and the blocks stay on
                  as an overlay of what we detected. Then the whole thing
                  collapses into clips. */}
              <div
                className={[
                  'site',
                  act === 'read' ? '' : 'is-falling',
                  shot ? 'has-shot' : '',
                ]
                  .filter(Boolean)
                  .join(' ')}
                aria-hidden="true"
              >
                {shot && <img className="site__shot" src={shot} alt="" />}
                <span className="site__block site__block--bar" />
                <span className="site__block site__block--hero" />
                <span className="site__row">
                  <i className="site__block" />
                  <i className="site__block" />
                  <i className="site__block" />
                </span>
                <span className="site__block site__block--wide" />
                <span className="site__block site__block--foot" />
                <span className="site__scan" />
              </div>

              {/* ACT III — the shots, drawn as they're storyboarded. Each
                  one gets a real picture off their site, so the storyboard
                  previews footage we actually have rather than a mock. */}
              <div className="board" aria-live="polite">
                {frames.map((frame, i) => (
                  <figure className="board__shot" key={frame.index}>
                    <span className="board__thumb">
                      {footage[i % Math.max(footage.length, 1)] && (
                        <img src={footage[i % footage.length]} alt="" />
                      )}
                    </span>
                    <figcaption>{frame.title}</figcaption>
                  </figure>
                ))}
              </div>

              {/* The script, becoming captions. */}
              {script.length > 0 && act !== 'done' && (
                <div className="lines">
                  {script.map((line) => (
                    <span className="lines__row" key={line}>
                      {line}
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* The finished cut. */}
            {act === 'done' && (
              <div className="pipe__result">
                <div className="preview__frame pipe__poster">
                  <span className="preview__poster" />
                  <span className="preview__play" aria-hidden="true" />
                  {script[0] && (
                    <span className="preview__caption">{script[0]}</span>
                  )}
                  <span className="preview__ratio">16:9 · 1080p</span>
                </div>
                <div className="pipe__done">
                  <h1>Your first cut is ready.</h1>
                  <p>
                    Seven seconds, cut from {job.scene.domain}. Change anything
                    you like in the editor.
                  </p>
                  <button
                    type="button"
                    className="btn btn--primary btn--lg"
                    onClick={() =>
                      navigate(`/editor?url=${encodeURIComponent(url)}`)
                    }
                  >
                    Open the editor
                  </button>
                </div>
              </div>
            )}

            {/* The haul. Every picture the curator lifts off the page lands
                here, so the wait is spent watching their own material pile
                up — and on the turn these are what the clips are made of. */}
            {footage.length > 0 && (
              <div className={`reel ${act === 'read' ? '' : 'is-loaded'}`}>
                {footage.map((src, i) => (
                  <span
                    className="reel__cell"
                    key={src}
                    style={{ '--i': i } as React.CSSProperties}
                  >
                    <img src={src} alt="" loading="lazy" />
                  </span>
                ))}
              </div>
            )}

            {/* The timeline, filling the whole way through. */}
            <div className={`timeline pipe__timeline ${act === 'done' ? 'is-playing' : ''}`}>
              <div className="timeline__clips">
                {clips.length === 0 ? (
                  <span className="pipe__empty">timeline empty</span>
                ) : (
                  clips.map((clip, i) => {
                    const still = footage[i % Math.max(footage.length, 1)]
                    return (
                      <span
                        key={clip.key}
                        // A clip carrying its own still reads as footage;
                        // the flat colour is the fallback when the site
                        // gave us nothing to put in it.
                        className={`clip clip--${clip.tone} ${still ? 'has-still' : ''}`}
                        style={{
                          flexGrow: clip.grow,
                          ...(still
                            ? ({ '--still': `url(${still})` } as React.CSSProperties)
                            : {}),
                        }}
                      >
                        {clip.title}
                      </span>
                    )
                  })
                )}
              </div>

              <div className="timeline__wave" aria-hidden="true">
                {WAVE.map((h, i) => (
                  <i
                    key={i}
                    style={{
                      height: `${h}%`,
                      // Bars light up left-to-right as the job advances.
                      opacity: i / WAVE.length <= progress ? 1 : 0.18,
                    }}
                  />
                ))}
              </div>

              <span className="timeline__head" />
            </div>
          </div>
        </div>

        <aside className="pipe__side">
          <ul className="plan pipe__crew">
            {stages.map((stage) => (
              <li
                className={`plan__item ${
                  stage.status === 'done'
                    ? 'is-done'
                    : stage.status === 'working'
                      ? 'is-active'
                      : ''
                }`}
                key={stage.id}
              >
                <span className="plan__tick" aria-hidden="true" />
                <span>
                  {stage.name}
                  {stage.label && <em>{stage.label}</em>}
                </span>
              </li>
            ))}
          </ul>

          {artifacts.length > 0 && (
            <div className="tray">
              <p className="tray__head">Pulled from the site</p>
              <div className="tray__chips">
                {artifacts.map((artifact, i) => (
                  <Chip artifact={artifact} key={`${artifact.kind}-${i}`} />
                ))}
              </div>
            </div>
          )}
        </aside>
      </div>

      <div className="pipe__log" aria-live="polite">
        {logs.slice(-3).map((line, i, shown) => (
          <p
            className="pipe__line"
            key={`${line}-${i}`}
            data-latest={i === shown.length - 1 ? 'true' : undefined}
          >
            {line}
          </p>
        ))}
      </div>

      {/* The one moment the screen stops moving. */}
      {beat && format && (
        <div className="beat" aria-live="polite">
          <p className="beat__eyebrow">Making you a</p>
          <h2 className="beat__format">{format}</h2>
          {decision && <p className="beat__reason">{decision.reason}</p>}

          {picking ? (
            <div className="beat__options">
              {ALTERNATIVES.map((option) => (
                <button
                  type="button"
                  className="beat__option"
                  key={option}
                  onClick={() => {
                    setFormat(option)
                    setPicking(false)
                    // Optimistic on purpose — the pipeline keeps going
                    // either way, so a failed PATCH mustn't stall the UI.
                    if (job.job) setProjectFormat(job.job, option)
                  }}
                >
                  {option}
                </button>
              ))}
            </div>
          ) : (
            <button
              type="button"
              className="beat__switch"
              onClick={() => setPicking(true)}
            >
              not this?
            </button>
          )}
        </div>
      )}
    </div>
  )
}

function Chip({ artifact }: { artifact: Artifact }) {
  if (artifact.kind === 'color') {
    return (
      <span className="chip chip--color">
        <i style={{ background: artifact.value }} />
        {artifact.value}
      </span>
    )
  }

  // A rendered page shot. Printing its name would waste the most
  // persuasive artifact we have — it's a picture of their own site.
  if (artifact.kind === 'image' && artifact.src) {
    return (
      <figure className="chip chip--shot">
        <img src={artifact.src} alt={artifact.label} loading="lazy" />
        <figcaption>{artifact.label}</figcaption>
      </figure>
    )
  }

  return (
    <span className="chip">
      <b>{artifact.label}</b>
      {artifact.value}
    </span>
  )
}
