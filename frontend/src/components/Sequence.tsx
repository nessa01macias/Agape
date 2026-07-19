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
            <h2 className="seq__title bloom">
              <Words>You say it once.</Words>
            </h2>
            <p className="seq__sub lede">Agape builds the whole timeline.</p>
          </header>

          <div className="mock">
            {/* menu bar */}
            <div className="mock__bar">
              <span className="mock__mark" aria-hidden="true" />
              <span className="mock__menu">
                {['File', 'View', 'Composition'].map((item) => (
                  <i key={item}>{item}</i>
                ))}
              </span>
              <span className="mock__file">
                untitled-project <s>/</s> <b>composition</b>
              </span>
              <span className="mock__actions">
                <i className="mock__share">Share</i>
                <i className="mock__render" style={cue(0.88, 10)}>
                  Render
                </i>
              </span>
            </div>

            {/* sidebar · preview · inspector */}
            <div className="mock__main">
              <div className="mock__side panel">
                <span className="mock__tabs">
                  <i className="is-on">Agents</i>
                  <i>Assets</i>
                </span>
                <ol className="mock__stages">
                  {STAGES.map((stage) => (
                    <li className="stage" key={stage.name} style={cue(stage.at)}>
                      <span className="stage__dot" aria-hidden="true" />
                      <span className="stage__name">{stage.name}</span>
                      <span className="stage__verb">{stage.verb}</span>
                    </li>
                  ))}
                </ol>
              </div>

              <div className="mock__preview">
                <div className="mock__frame">
                  <span className="mock__label">PREVIEW</span>
                  <span className="mock__poster" aria-hidden="true" />
                  <span className="mock__crop" style={cue(0.78, 7)} aria-hidden="true">
                    <b>9:16</b>
                  </span>
                  <span className="mock__caption" style={cue(0.84)}>
                    ship it <b>tonight</b>
                  </span>
                </div>
                <div className="mock__transport tnum">
                  <span className="mock__time">
                    00:01<s>.12</s>
                  </span>
                  <i className="mock__play" aria-hidden="true" />
                </div>
              </div>

              <div className="mock__inspector panel">
                <span className="mock__tabs">
                  <i className="is-on">Inspector</i>
                </span>
                <div className="mock__props">
                  <b>main</b>
                  {INSPECTOR.map((row) => (
                    <span className="mock__prop" key={row.k} style={cue(row.at)}>
                      <i>{row.k}</i>
                      <em className="tnum">{row.v}</em>
                    </span>
                  ))}
                </div>
              </div>
            </div>

            {/* timeline */}
            <div className="mock__timeline panel">
              <div className="mock__tl-bar">
                <span className="mock__tc tnum">00:01:12:08</span>
                <span className="mock__tc-total tnum">/ 00:00:05:00</span>
                <span className="mock__tools" aria-hidden="true">
                  {['↖', '↔', '✂', 'T'].map((tool, i) => (
                    <i key={tool} className={i === 0 ? 'is-on' : ''}>
                      {tool}
                    </i>
                  ))}
                </span>
              </div>

              <div className="mock__ruler">
                <span className="mock__gutter" />
                <span className="mock__ticks tnum">
                  {TICKS.map((tick) => (
                    <i key={tick}>{tick}</i>
                  ))}
                </span>
              </div>

              <div className="mock__tracks">
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
                <span className="mock__playhead" aria-hidden="true">
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
