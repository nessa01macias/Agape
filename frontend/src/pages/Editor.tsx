/* ---------------------------------------------------------------
   Agape — the editor
   ---------------------------------------------------------------
   Poppins design: menu bar on top, compositions left, preview +
   transport centre, inspector right, timeline across the bottom.

   The Remotion Player is the single source of playback truth — the
   transport and the timeline playhead both read frames off it via
   `frameupdate`, and scrubbing writes back with `seekTo`.
   --------------------------------------------------------------- */

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { Player, type PlayerRef } from '@remotion/player'
import { useJob } from '../hooks/useJob'
import { useRender } from '../hooks/useRender'
import type { Job } from '../lib/jobs'
import { LaunchTemplate, type LaunchProps } from '../remotion/LaunchTemplate'
import { PRESET_THEMES } from '../remotion/theme'
import {
  DURATION_IN_FRAMES,
  FPS,
  SHOTS,
  VIDEO_HEIGHT,
  VIDEO_WIDTH,
} from '../remotion/constants'
import './Editor.css'

/** Editor opened bare (no pipeline run) still needs a brand to cut. */
const DEFAULT_URL = 'agape.co'

/* ---- timeline model — mirrors what Scene.tsx actually renders ---- */

type Clip = {
  id: string
  name: string
  from: number
  to: number
  /** 'solid' for the primary clip, 'soft' for overlays, 'audio' for A-tracks */
  tone: 'solid' | 'soft' | 'audio'
}

type Track = {
  id: string
  label: string
  sub: string
  kind: 'video' | 'audio'
  muted?: boolean
  clips: Clip[]
}

const TRACKS: Track[] = [
  {
    id: 'v3',
    label: 'V3',
    sub: 'Lower third',
    kind: 'video',
    clips: [
      { id: 'domain-chip', name: 'domain.chip', from: 150, to: 222, tone: 'soft' },
      { id: 'domain-pill', name: 'domain.pill', from: 312, to: DURATION_IN_FRAMES, tone: 'soft' },
    ],
  },
  {
    id: 'v2',
    label: 'V2',
    sub: 'Titles',
    kind: 'video',
    clips: [
      { id: 'headline', name: 'headline', from: 0, to: 54, tone: 'soft' },
      { id: 'introducing', name: 'introducing', from: 58, to: 120, tone: 'soft' },
      { id: 'tagline', name: 'tagline', from: 238, to: 294, tone: 'soft' },
      { id: 'lockup-titles', name: 'lockup', from: 302, to: DURATION_IN_FRAMES, tone: 'soft' },
    ],
  },
  {
    id: 'v1',
    label: 'V1',
    sub: 'Video 1',
    kind: 'video',
    // Generated from SHOTS so the timeline can never drift from the template.
    clips: SHOTS.map((shot) => ({
      id: shot.id,
      name: `shot.${shot.id}`,
      from: shot.from,
      to: shot.to,
      tone: 'solid' as const,
    })),
  },
  {
    id: 'a1',
    label: 'A1',
    sub: 'Audio 1',
    kind: 'audio',
    clips: [{ id: 'soundtrack', name: 'soundtrack.wav', from: 0, to: DURATION_IN_FRAMES, tone: 'audio' }],
  },
  {
    id: 'a2',
    label: 'A2',
    sub: 'Audio 2',
    kind: 'audio',
    muted: true,
    clips: [{ id: 'vo', name: 'vo_take3.wav', from: 234, to: 294, tone: 'audio' }],
  },
]

const CLIP_INDEX = new Map(
  TRACKS.flatMap((track) => track.clips.map((clip) => [clip.id, clip])),
)

const MENU_ITEMS = ['File', 'View', 'Composition', 'Tools', 'Help']
const COMPS = ['main', 'intro', 'outro']

/* ---- timecode ---- */

const pad = (n: number) => String(n).padStart(2, '0')

/** HH:MM:SS:FF — the timeline's long form. */
function tcLong(frame: number): string {
  const total = Math.floor(frame / FPS)
  const ff = Math.floor(frame % FPS)
  return `${pad(Math.floor(total / 3600))}:${pad(Math.floor(total / 60) % 60)}:${pad(total % 60)}:${pad(ff)}`
}

/** MM:SS.FF split for the transport's dimmed frames. */
function tcShort(frame: number): [string, string] {
  const total = Math.floor(frame / FPS)
  return [
    `${pad(Math.floor(total / 60))}:${pad(total % 60)}`,
    pad(Math.floor(frame % FPS)),
  ]
}

const clipDur = (clip: Clip) => tcLong(clip.to - clip.from).slice(3)

export function Editor() {
  const [params] = useSearchParams()
  return <EditorView url={params.get('url') ?? DEFAULT_URL} />
}

/**
 * Renders the cut to an MP4 on the backend. Only meaningful once the
 * pipeline has finished — before that there's no project to render — and
 * never against a mock job, which has no backend behind it.
 */
function RenderButton({
  job,
  ready,
  scene,
}: {
  job: Job | null
  ready: boolean
  scene: LaunchProps
}) {
  const { state, start } = useRender(job, scene)

  if (state.phase === 'done') {
    return (
      <a className="ed__btn ed__btn--primary" href={state.url} download>
        Download
      </a>
    )
  }

  const mock = job?.source === 'mock'
  const busy = state.phase === 'starting' || state.phase === 'rendering'

  return (
    <button
      type="button"
      className="ed__btn ed__btn--primary"
      disabled={busy || mock || !ready}
      onClick={() => void start()}
      title={
        mock
          ? "Backend isn't answering — start it to render."
          : !ready
            ? 'Still cutting — render once the pipeline finishes.'
            : state.phase === 'error'
              ? state.message
              : 'Render this cut to an MP4'
      }
    >
      {state.phase === 'error'
        ? 'Retry'
        : state.phase === 'starting'
          ? 'Starting…'
          : state.phase === 'rendering'
            ? `${Math.round(state.progress * 100)}%`
            : 'Render'}
    </button>
  )
}

function EditorView({ url }: { url: string }) {
  const job = useJob(url)

  // Inspector edits win over whatever the pipeline guessed.
  const [overrides, setOverrides] = useState<Partial<LaunchProps>>({})
  const [presetName, setPresetName] = useState('neonDark')
  const scene = useMemo(
    () => ({ ...job.scene, ...overrides }),
    [job.scene, overrides],
  )

  const playerRef = useRef<PlayerRef>(null)
  const [frame, setFrame] = useState(0)
  const [playing, setPlaying] = useState(false)
  const [loop, setLoop] = useState(true)

  const [leftTab, setLeftTab] = useState<'comps' | 'assets'>('comps')
  const [rightTab, setRightTab] = useState<'inspector' | 'renders'>('inspector')
  const [comp, setComp] = useState('main')
  const [selectedClip, setSelectedClip] = useState<string | null>('product')
  const [zoom, setZoom] = useState(1)
  const [shared, setShared] = useState(false)

  // The player mounts inside <Player> after first paint; poll the ref once.
  useEffect(() => {
    const player = playerRef.current
    if (!player) return

    const onFrame = (e: { detail: { frame: number } }) => setFrame(e.detail.frame)
    const onPlay = () => setPlaying(true)
    const onPause = () => setPlaying(false)

    player.addEventListener('frameupdate', onFrame)
    player.addEventListener('play', onPlay)
    player.addEventListener('pause', onPause)
    return () => {
      player.removeEventListener('frameupdate', onFrame)
      player.removeEventListener('play', onPlay)
      player.removeEventListener('pause', onPause)
    }
  }, [])

  const seek = useCallback((target: number) => {
    const clamped = Math.max(0, Math.min(DURATION_IN_FRAMES - 1, Math.round(target)))
    playerRef.current?.seekTo(clamped)
    setFrame(clamped)
  }, [])

  /* ---- timeline scrubbing ---- */

  const laneRef = useRef<HTMLDivElement>(null)
  const scrubbing = useRef(false)

  const seekFromPointer = useCallback(
    (e: ReactPointerEvent) => {
      const lane = laneRef.current
      if (!lane) return
      const rect = lane.getBoundingClientRect()
      const frac = (e.clientX - rect.left) / rect.width
      seek(frac * DURATION_IN_FRAMES)
    },
    [seek],
  )

  const onLaneDown = useCallback(
    (e: ReactPointerEvent) => {
      scrubbing.current = true
      e.currentTarget.setPointerCapture(e.pointerId)
      seekFromPointer(e)
    },
    [seekFromPointer],
  )

  const onLaneMove = useCallback(
    (e: ReactPointerEvent) => {
      if (scrubbing.current) seekFromPointer(e)
    },
    [seekFromPointer],
  )

  const onLaneUp = useCallback(() => {
    scrubbing.current = false
  }, [])

  const share = useCallback(() => {
    navigator.clipboard?.writeText(window.location.href).catch(() => {})
    setShared(true)
    setTimeout(() => setShared(false), 1400)
  }, [])

  const selected = selectedClip ? CLIP_INDEX.get(selectedClip) : undefined
  const playFrac = frame / DURATION_IN_FRAMES
  const [tcMain, tcFrames] = tcShort(frame)
  const ticks = Array.from({ length: Math.ceil(DURATION_IN_FRAMES / FPS) }, (_, i) => tcLong(i * FPS).slice(3, 8))

  return (
    <div className="ed">
      {/* ---- menu bar ---- */}
      <header className="ed__menubar">
        <Link to="/" className="ed__logo" aria-label="Back to Agape">
          <span className="ed__logo-play" />
        </Link>
        {MENU_ITEMS.map((item) => (
          <button key={item} type="button" className="ed__menu-item">
            {item}
          </button>
        ))}
        <div className="ed__crumb">
          untitled-project <span className="ed__crumb-sep">/</span>{' '}
          <strong>{comp}</strong>
        </div>
        <div className="ed__menubar-actions">
          <button type="button" className="ed__btn" onClick={share}>
            {shared ? 'Copied' : 'Share'}
          </button>
          <RenderButton job={job.job} ready={job.ready} scene={scene} />
        </div>
      </header>

      {/* ---- main row ---- */}
      <div className="ed__main">
        {/* left — compositions / assets */}
        <aside className="ed__panel">
          <div className="ed__tabs">
            <button
              type="button"
              className={`ed__tab ${leftTab === 'comps' ? 'is-active' : ''}`}
              onClick={() => setLeftTab('comps')}
            >
              Compositions
            </button>
            <button
              type="button"
              className={`ed__tab ${leftTab === 'assets' ? 'is-active' : ''}`}
              onClick={() => setLeftTab('assets')}
            >
              Assets
            </button>
          </div>

          {leftTab === 'comps' ? (
            <div className="ed__panel-body">
              {COMPS.map((name) => (
                <button
                  key={name}
                  type="button"
                  className={`ed__comp ${comp === name ? 'is-active' : ''}`}
                  onClick={() => setComp(name)}
                >
                  <span className="ed__comp-dot" />
                  {name}
                </button>
              ))}
              <button type="button" className="ed__new" disabled title="One composition per project for now.">
                + New
              </button>
            </div>
          ) : (
            <div className="ed__panel-body">
              {job.artifacts.length === 0 ? (
                <p className="ed__empty">Nothing pulled from the site yet.</p>
              ) : (
                job.artifacts.map((a, i) => (
                  <div key={`${a.kind}-${i}`} className="ed__asset">
                    {a.kind === 'color' ? (
                      <span className="ed__swatch" style={{ background: a.value }} />
                    ) : (
                      <span className="ed__asset-glyph">{a.value.slice(0, 14)}</span>
                    )}
                    <span className="ed__asset-label">{a.label}</span>
                  </div>
                ))
              )}
            </div>
          )}
        </aside>

        {/* centre — preview + transport */}
        <div className="ed__centre">
          <div className="ed__preview-wrap">
            <div className="ed__preview">
              <Player
                ref={playerRef}
                component={LaunchTemplate}
                inputProps={scene}
                durationInFrames={DURATION_IN_FRAMES}
                fps={FPS}
                compositionWidth={VIDEO_WIDTH}
                compositionHeight={VIDEO_HEIGHT}
                loop={loop}
                style={{ width: '100%', height: '100%' }}
              />
              <span className="ed__preview-tag">PREVIEW</span>
            </div>
          </div>

          <div className="ed__transport">
            <div className="ed__tc">
              {tcMain}
              <span>.{tcFrames}</span>
            </div>
            <button type="button" className="ed__tbtn" title="To start" onClick={() => seek(0)}>
              <i className="iconoir-skip-prev" />
            </button>
            <button type="button" className="ed__tbtn" title="Back one frame" onClick={() => seek(frame - 1)}>
              <i className="iconoir-nav-arrow-left" />
            </button>
            <button
              type="button"
              className="ed__tbtn ed__tbtn--play"
              title={playing ? 'Pause' : 'Play'}
              onClick={() => playerRef.current?.toggle()}
            >
              <i className={playing ? 'iconoir-pause-solid' : 'iconoir-play-solid'} />
            </button>
            <button type="button" className="ed__tbtn" title="Forward one frame" onClick={() => seek(frame + 1)}>
              <i className="iconoir-nav-arrow-right" />
            </button>
            <button type="button" className="ed__tbtn" title="To end" onClick={() => seek(DURATION_IN_FRAMES - 1)}>
              <i className="iconoir-skip-next" />
            </button>
            <span className="ed__tdiv" />
            <button
              type="button"
              className={`ed__tbtn ed__tbtn--small ${loop ? 'is-on' : ''}`}
              title="Loop"
              onClick={() => setLoop((v) => !v)}
            >
              <i className="iconoir-repeat" />
            </button>
            <button
              type="button"
              className="ed__tbtn ed__tbtn--small"
              title="Fullscreen"
              onClick={() => playerRef.current?.requestFullscreen()}
            >
              <i className="iconoir-expand" />
            </button>
          </div>
        </div>

        {/* right — inspector / renders */}
        <aside className="ed__panel">
          <div className="ed__tabs">
            <button
              type="button"
              className={`ed__tab ${rightTab === 'inspector' ? 'is-active' : ''}`}
              onClick={() => setRightTab('inspector')}
            >
              Inspector
            </button>
            <button
              type="button"
              className={`ed__tab ${rightTab === 'renders' ? 'is-active' : ''}`}
              onClick={() => setRightTab('renders')}
            >
              Renders
            </button>
          </div>

          {rightTab === 'inspector' ? (
            <div className="ed__panel-body ed__inspector">
              <h2 className="ed__insp-title">{selected ? selected.name : comp}</h2>

              <div className="ed__prop">
                <span>Resolution</span>
                <span className="ed__prop-val">{VIDEO_WIDTH} × {VIDEO_HEIGHT}</span>
              </div>
              <div className="ed__prop">
                <span>Frame rate</span>
                <span className="ed__prop-val">{FPS} fps</span>
              </div>
              <div className="ed__prop">
                <span>Duration</span>
                <span className="ed__prop-val">{tcLong(DURATION_IN_FRAMES).slice(3)}</span>
              </div>
              {selected ? (
                <>
                  <div className="ed__prop">
                    <span>In</span>
                    <span className="ed__prop-val">{tcLong(selected.from).slice(3)}</span>
                  </div>
                  <div className="ed__prop">
                    <span>Out</span>
                    <span className="ed__prop-val">{tcLong(selected.to).slice(3)}</span>
                  </div>
                </>
              ) : (
                <div className="ed__prop">
                  <span>Layers</span>
                  <span className="ed__prop-val">{TRACKS.length}</span>
                </div>
              )}

              <h2 className="ed__insp-title ed__insp-title--gap">brand</h2>
              <label className="ed__prop ed__prop--edit">
                <span>Name</span>
                <input
                  value={scene.brandName}
                  onChange={(e) => setOverrides((o) => ({ ...o, brandName: e.target.value }))}
                />
              </label>
              <label className="ed__prop ed__prop--edit">
                <span>Domain</span>
                <input
                  value={scene.domain}
                  onChange={(e) => setOverrides((o) => ({ ...o, domain: e.target.value }))}
                />
              </label>

              <h2 className="ed__insp-title ed__insp-title--gap">copy</h2>
              <label className="ed__prop ed__prop--edit">
                <span>Headline</span>
                <input
                  value={scene.headline}
                  onChange={(e) => setOverrides((o) => ({ ...o, headline: e.target.value }))}
                />
              </label>
              <label className="ed__prop ed__prop--edit">
                <span>Tagline</span>
                <input
                  value={scene.tagline}
                  onChange={(e) => setOverrides((o) => ({ ...o, tagline: e.target.value }))}
                />
              </label>
              <label className="ed__prop ed__prop--edit">
                <span>CTA</span>
                <input
                  value={scene.cta}
                  onChange={(e) => setOverrides((o) => ({ ...o, cta: e.target.value }))}
                />
              </label>

              <h2 className="ed__insp-title ed__insp-title--gap">theme</h2>
              <label className="ed__prop ed__prop--edit">
                <span>Preset</span>
                <select
                  value={presetName}
                  onChange={(e) => {
                    setPresetName(e.target.value)
                    setOverrides((o) => ({ ...o, theme: PRESET_THEMES[e.target.value] }))
                  }}
                >
                  {Object.keys(PRESET_THEMES).map((name) => (
                    <option key={name} value={name}>
                      {name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="ed__prop ed__prop--edit">
                <span>Accent</span>
                <span className="ed__accent">
                  <input
                    type="color"
                    value={scene.theme.colors.accent}
                    onChange={(e) =>
                      setOverrides((o) => ({
                        ...o,
                        theme: {
                          ...scene.theme,
                          colors: { ...scene.theme.colors, accent: e.target.value },
                        },
                      }))
                    }
                  />
                  <span className="ed__prop-val">{scene.theme.colors.accent}</span>
                </span>
              </label>
            </div>
          ) : (
            <div className="ed__panel-body ed__renders">
              {job.logs.length === 0 ? (
                <p className="ed__empty">No renders yet — the pipeline log lands here.</p>
              ) : (
                job.logs.map((line, i) => (
                  <p key={i} className="ed__log-line">{line}</p>
                ))
              )}
            </div>
          )}
        </aside>
      </div>

      {/* ---- timeline ---- */}
      <section className="ed__timeline">
        <header className="ed__tl-bar">
          <div className="ed__tl-tc">
            <strong>{tcLong(frame)}</strong>
            <span>/ {tcLong(DURATION_IN_FRAMES)}</span>
          </div>
          <span className="ed__vdiv" />
          <div className="ed__tools">
            <button type="button" className="ed__tool is-active" title="Select">
              <i className="iconoir-cursor-pointer" />
            </button>
            <button type="button" className="ed__tool" title="Ripple">
              <i className="iconoir-arrow-separate" />
            </button>
            <button type="button" className="ed__tool" title="Cut">
              <i className="iconoir-cut" />
            </button>
            <button type="button" className="ed__tool" title="Text">
              <i className="iconoir-text" />
            </button>
          </div>
          <span className="ed__vdiv" />
          <div className="ed__inout">
            <span>IN {tcLong(0)}</span>
            <span className="ed__inout-dot">·</span>
            <span>OUT {tcLong(DURATION_IN_FRAMES - 1)}</span>
          </div>
          <div className="ed__tl-spacer" />
          <div className="ed__tl-right">
            <button type="button" className="ed__tool" title="Search">
              <i className="iconoir-search" />
            </button>
            <input
              type="range"
              className="ed__zoom"
              min={1}
              max={4}
              step={0.1}
              value={zoom}
              onChange={(e) => setZoom(Number(e.target.value))}
              title="Timeline zoom"
            />
            <button type="button" className="ed__tool" title="Zoom in" onClick={() => setZoom((z) => Math.min(4, z + 0.5))}>
              +
            </button>
            <button type="button" className="ed__tool" title="More">
              <i className="iconoir-more-horiz" />
            </button>
          </div>
        </header>

        <div className="ed__tl-body">
          {/* track heads — fixed column */}
          <div className="ed__tl-heads">
            <div className="ed__tl-corner" />
            {TRACKS.map((track, i) => (
              <div key={track.id}>
                {track.kind === 'audio' && TRACKS[i - 1]?.kind === 'video' && (
                  <div className="ed__tl-split" />
                )}
                <div className="ed__track-head">
                  <div>
                    <div className="ed__track-label">{track.label}</div>
                    <div className="ed__track-sub">{track.sub}</div>
                  </div>
                  <div className="ed__toggles">
                    {track.kind === 'video' ? (
                      <>
                        <button type="button" className="ed__toggle" title="Visibility">
                          <i className="iconoir-eye" />
                        </button>
                        <button type="button" className="ed__toggle" title="Lock">
                          <i className="iconoir-lock" />
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          type="button"
                          className={`ed__toggle ${track.muted ? 'is-on' : ''}`}
                          title="Mute"
                        >
                          M
                        </button>
                        <button type="button" className="ed__toggle" title="Solo">
                          S
                        </button>
                      </>
                    )}
                    <button type="button" className="ed__toggle" title="More">
                      <i className="iconoir-more-horiz" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* lanes — scrolls horizontally under zoom */}
          <div className="ed__tl-scroll">
            <div
              ref={laneRef}
              className="ed__tl-lanes"
              style={{ width: `${zoom * 100}%` }}
              onPointerDown={onLaneDown}
              onPointerMove={onLaneMove}
              onPointerUp={onLaneUp}
            >
              <div className="ed__ruler">
                {ticks.map((t) => (
                  <span key={t} className="ed__tick">{t}</span>
                ))}
              </div>

              {TRACKS.map((track, i) => (
                <div key={track.id}>
                  {track.kind === 'audio' && TRACKS[i - 1]?.kind === 'video' && (
                    <div className="ed__tl-split" />
                  )}
                  <div className="ed__lane">
                    {track.clips.map((clip) => (
                      <button
                        key={clip.id}
                        type="button"
                        className={`ed__clip ed__clip--${clip.tone} ${selectedClip === clip.id ? 'is-selected' : ''}`}
                        style={{
                          left: `${(clip.from / DURATION_IN_FRAMES) * 100}%`,
                          width: `${((clip.to - clip.from) / DURATION_IN_FRAMES) * 100}%`,
                        }}
                        onPointerDown={(e) => e.stopPropagation()}
                        onClick={() =>
                          setSelectedClip((cur) => (cur === clip.id ? null : clip.id))
                        }
                      >
                        <span className="ed__clip-name">{clip.name}</span>
                        <span className="ed__clip-dur">{clipDur(clip)}</span>
                      </button>
                    ))}
                  </div>
                </div>
              ))}

              {/* playhead — chip shifts near the edges so the scroll
                  container's overflow clipping never swallows it */}
              <div className="ed__playhead" style={{ left: `${playFrac * 100}%` }}>
                <span
                  className="ed__playhead-chip"
                  style={{
                    transform: `translateX(${
                      playFrac < 0.04 ? '0%' : playFrac > 0.96 ? '-100%' : '-50%'
                    })`,
                  }}
                >
                  {tcLong(frame).slice(3)}
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
