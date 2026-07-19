import type { CSSProperties } from 'react'
import { useScrollProgress } from '../hooks/useScrollProgress'
import { Words } from './Words'
import './Sequence.css'

/** Mirrors the pipeline stages in `lib/jobs.ts`. */
const STAGES = [
  { name: 'Scout', verb: 'reads your site', at: 0.06 },
  { name: 'Curator', verb: 'picks the shots', at: 0.16 },
  { name: 'Strategist', verb: 'sets the format', at: 0.26 },
  { name: 'Writer', verb: 'writes the script', at: 0.36 },
  { name: 'Director', verb: 'cuts it together', at: 0.46 },
]

const VIDEO_TRACKS = [
  {
    label: 'V3',
    sub: 'Video 3',
    clips: [{ name: 'lower-third', left: '40%', width: '16%', tone: 'soft', at: 0.62 }],
  },
  {
    label: 'V2',
    sub: 'Video 2',
    clips: [
      { name: 'title', left: '12%', width: '18%', tone: 'soft', at: 0.56 },
      { name: 'logo', left: '70%', width: '12%', tone: 'soft', at: 0.6 },
    ],
  },
  {
    label: 'V1',
    sub: 'Video 1',
    clips: [
      { name: 'intro.mp4', left: '1.5%', width: '26%', tone: 'teal', at: 0.4 },
      { name: 'main_scene.mp4', left: '27.5%', width: '37.5%', tone: 'sel', at: 0.46 },
      { name: 'outro.mp4', left: '65%', width: '23.5%', tone: 'teal', at: 0.52 },
    ],
  },
]

const AUDIO_TRACKS = [
  {
    label: 'A1',
    sub: 'Audio 1',
    clips: [{ name: 'soundtrack.wav', left: '1.5%', width: '87%', tone: 'aud', at: 0.68 }],
  },
  {
    label: 'A2',
    sub: 'Audio 2',
    clips: [{ name: 'vo_take3.wav', left: '27.5%', width: '33%', tone: 'aud', at: 0.72 }],
  },
]

const INSPECTOR = [
  { k: 'Resolution', v: '1920 × 1080', at: 0.3 },
  { k: 'Frame rate', v: '30 fps', at: 0.34 },
  { k: 'Duration', v: '00:05.00', at: 0.38 },
  { k: 'Layers', v: '5', at: 0.62 },
]

const TICKS = ['00:00', '00:01', '00:02', '00:03', '00:04']

/** `--in` is where on the 0→1 scrub this element starts resolving. */
const cue = (at: number, ramp = 12): CSSProperties =>
  ({ '--in': at, '--ramp': ramp }) as CSSProperties

export function Sequence() {
  // The scrub must finish on the last pinned frame, not after the unpin.
  const ref = useScrollProgress<HTMLDivElement>({ mode: 'sticky' })

  return (
    <section className="seq" id="how">
      <div className="seq__track" ref={ref}>
        <div className="seq__sticky">
          <header className="seq__head">
            <h2 className="seq__title">
              <Words className="bloom">You say it once.</Words>
            </h2>
            <p className="seq__sub lede">Agape builds the whole timeline.</p>
          </header>

          <div className="ed">
            {/* menu bar */}
            <div className="ed__bar">
              <span className="ed__mark" aria-hidden="true" />
              <span className="ed__menu">
                {['File', 'View', 'Composition'].map((item) => (
                  <i key={item}>{item}</i>
                ))}
              </span>
              <span className="ed__file">
                untitled-project <s>/</s> <b>composition</b>
              </span>
              <span className="ed__actions">
                <i className="ed__share">Share</i>
                <i className="ed__render" style={cue(0.88, 10)}>
                  Render
                </i>
              </span>
            </div>

            {/* sidebar · preview · inspector */}
            <div className="ed__main">
              <div className="ed__side panel">
                <span className="ed__tabs">
                  <i className="is-on">Agents</i>
                  <i>Assets</i>
                </span>
                <ol className="ed__stages">
                  {STAGES.map((stage) => (
                    <li className="stage" key={stage.name} style={cue(stage.at)}>
                      <span className="stage__dot" aria-hidden="true" />
                      <span className="stage__name">{stage.name}</span>
                      <span className="stage__verb">{stage.verb}</span>
                    </li>
                  ))}
                </ol>
              </div>

              <div className="ed__preview">
                <div className="ed__frame">
                  <span className="ed__label">PREVIEW</span>
                  <span className="ed__poster" aria-hidden="true" />
                  <span className="ed__crop" style={cue(0.78, 7)} aria-hidden="true">
                    <b>9:16</b>
                  </span>
                  <span className="ed__caption" style={cue(0.84)}>
                    ship it <b>tonight</b>
                  </span>
                </div>
                <div className="ed__transport tnum">
                  <span className="ed__time">
                    00:01<s>.12</s>
                  </span>
                  <i className="ed__play" aria-hidden="true" />
                </div>
              </div>

              <div className="ed__inspector panel">
                <span className="ed__tabs">
                  <i className="is-on">Inspector</i>
                </span>
                <div className="ed__props">
                  <b>main</b>
                  {INSPECTOR.map((row) => (
                    <span className="ed__prop" key={row.k} style={cue(row.at)}>
                      <i>{row.k}</i>
                      <em className="tnum">{row.v}</em>
                    </span>
                  ))}
                </div>
              </div>
            </div>

            {/* timeline */}
            <div className="ed__timeline panel">
              <div className="ed__tl-bar">
                <span className="ed__tc tnum">00:01:12:08</span>
                <span className="ed__tc-total tnum">/ 00:00:05:00</span>
                <span className="ed__tools" aria-hidden="true">
                  {['↖', '↔', '✂', 'T'].map((tool, i) => (
                    <i key={tool} className={i === 0 ? 'is-on' : ''}>
                      {tool}
                    </i>
                  ))}
                </span>
              </div>

              <div className="ed__ruler">
                <span className="ed__gutter" />
                <span className="ed__ticks tnum">
                  {TICKS.map((tick) => (
                    <i key={tick}>{tick}</i>
                  ))}
                </span>
              </div>

              <div className="ed__tracks">
                {[...VIDEO_TRACKS, ...AUDIO_TRACKS].map((track) => (
                  <div className="trk" key={track.label}>
                    <span className="trk__head">
                      <b>{track.label}</b>
                      <i>{track.sub}</i>
                    </span>
                    <span className="trk__lane">
                      {track.clips.map((clip) => (
                        <span
                          className={`cl cl--${clip.tone}`}
                          key={clip.name}
                          style={{ ...cue(clip.at), left: clip.left, width: clip.width }}
                        >
                          {clip.name}
                        </span>
                      ))}
                    </span>
                  </div>
                ))}
                <span className="ed__playhead" aria-hidden="true">
                  <b className="tnum">00:01:12</b>
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
