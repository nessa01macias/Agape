import './Marquee.css'

const CAPABILITIES = [
  'Cut the dead air',
  'Word-level captions',
  'Vertical re-frames',
  'B-roll from your site',
  'Twelve ad variants',
  'Brand colors, applied',
  'Voiceover cleanup',
  'Thumbnails',
]

export function Marquee() {
  return (
    <div className="marquee" aria-hidden="true">
      <div className="marquee__track">
        {/* Two identical runs so the loop has no visible seam. */}
        {[0, 1].map((run) => (
          <div className="marquee__run" key={run}>
            {CAPABILITIES.map((item) => (
              <span className="marquee__item" key={item}>
                {item}
                <i className="marquee__sep" />
              </span>
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}
