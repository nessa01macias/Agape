import { useEffect, useRef } from 'react'
import { Link, Navigate, useSearchParams } from 'react-router-dom'
import { Player } from '@remotion/player'
import { Logo } from '../components/Logo'
import { useJob } from '../hooks/useJob'
import { Scene } from '../remotion/Scene'
import {
  DURATION_IN_FRAMES,
  FPS,
  VIDEO_HEIGHT,
  VIDEO_WIDTH,
} from '../remotion/constants'
import './Editor.css'

export function Editor() {
  const [params] = useSearchParams()
  const url = params.get('url')

  // Deep-linked here without a site to work from — nothing to show.
  if (!url) return <Navigate to="/" replace />

  return <EditorView url={url} />
}

/**
 * Split out so `useJob` runs below the redirect guard — hooks can't sit
 * after a conditional return.
 */
function EditorView({ url }: { url: string }) {
  const job = useJob(url)
  const { scene, artifacts, decision, script, logs, stages, progress } = job

  return (
    <div className="editor">
      <header className="editor__bar">
        <Link to="/" className="editor__home" aria-label="Back to Agape">
          <Logo size={22} />
        </Link>

        <div className="editor__site">
          {scene.domain}
          {job.job?.source === 'mock' && (
            <span className="editor__pill" title="The backend isn't answering yet — this is the scripted stand-in.">
              mock
            </span>
          )}
        </div>

        <button
          type="button"
          className="btn btn--primary editor__export"
          disabled
          title="Rendering needs the Node render service — not wired up yet."
        >
          Export MP4
        </button>
      </header>

      <div
        className="editor__progress"
        role="progressbar"
        aria-valuenow={Math.round(progress * 100)}
        aria-valuemin={0}
        aria-valuemax={100}
      >
        <span style={{ transform: `scaleX(${progress})` }} />
      </div>

      <div className="editor__body">
        <aside className="editor__rail">
          <Pipeline stages={stages} />
          {artifacts.length > 0 && <Artifacts items={artifacts} />}
          {decision && <Decision {...decision} />}
          {script.length > 0 && <Script lines={script} />}
          <Console lines={logs} />
        </aside>

        <main className="editor__stage">
          <Player
            component={Scene}
            inputProps={scene}
            durationInFrames={DURATION_IN_FRAMES}
            fps={FPS}
            compositionWidth={VIDEO_WIDTH}
            compositionHeight={VIDEO_HEIGHT}
            controls
            autoPlay
            loop
            className="editor__player"
          />

          {job.phase === 'error' && (
            <p className="editor__error" role="alert">
              {job.error}
            </p>
          )}
        </main>
      </div>
    </div>
  )
}

function Pipeline({ stages }: { stages: ReturnType<typeof useJob>['stages'] }) {
  return (
    <section className="rail__block">
      <h2 className="rail__title">Pipeline</h2>
      <ol className="pipeline">
        {stages.map((stage) => (
          <li key={stage.id} className={`pipeline__row is-${stage.status}`}>
            <span className="pipeline__dot" aria-hidden="true" />
            <span className="pipeline__name">{stage.name}</span>
            <span className="pipeline__label">{stage.label}</span>
          </li>
        ))}
      </ol>
    </section>
  )
}

function Artifacts({ items }: { items: ReturnType<typeof useJob>['artifacts'] }) {
  return (
    <section className="rail__block">
      <h2 className="rail__title">Pulled from the site</h2>
      <ul className="etray">
        {items.map((item, index) => (
          <li key={`${item.kind}-${item.value}-${index}`} className="etray__item">
            {item.kind === 'color' ? (
              <span className="etray__swatch" style={{ background: item.value }} />
            ) : (
              <span className="etray__glyph">
                {item.kind === 'logo' ? item.value : item.value.slice(0, 18)}
              </span>
            )}
            <span className="etray__label">{item.label}</span>
          </li>
        ))}
      </ul>
    </section>
  )
}

function Decision({ format, reason }: { format: string; reason: string }) {
  return (
    <section className="rail__block">
      <h2 className="rail__title">Format</h2>
      <p className="decision__format">{format}</p>
      <p className="decision__reason">{reason}</p>
    </section>
  )
}

function Script({ lines }: { lines: string[] }) {
  return (
    <section className="rail__block">
      <h2 className="rail__title">Script</h2>
      <ol className="script">
        {lines.map((line, index) => (
          <li key={index}>{line}</li>
        ))}
      </ol>
    </section>
  )
}

function Console({ lines }: { lines: string[] }) {
  const end = useRef<HTMLDivElement>(null)

  useEffect(() => {
    end.current?.scrollIntoView({ block: 'nearest' })
  }, [lines])

  return (
    <section className="rail__block rail__block--grow">
      <h2 className="rail__title">Console</h2>
      <div className="console">
        {lines.map((line, index) => (
          <p key={index} className="console__line">
            {line}
          </p>
        ))}
        <div ref={end} />
      </div>
    </section>
  )
}
