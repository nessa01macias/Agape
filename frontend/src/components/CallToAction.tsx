import './CallToAction.css'

export function CallToAction() {
  return (
    <section className="section cta" id="start">
      <div className="container">
        <div className="cta__panel" data-reveal>
          <div className="cta__glow" aria-hidden="true" />

          <h2 className="cta__title">
            It's Thursday.
            <span className="cta__accent">The thing ships Monday.</span>
          </h2>

          <p className="cta__body">
            Nobody on the team owns video. That's fine — nobody has to. Paste the
            URL and have something to post by morning.
          </p>

          <div className="cta__actions">
            <a className="btn btn--primary btn--lg" href="#top">
              Start free
            </a>
            <a className="btn btn--ghost btn--lg" href="#editor">
              See it work
            </a>
          </div>

          <p className="cta__fine">
            Free while we're in early access · No card, no sales call
          </p>
        </div>
      </div>
    </section>
  )
}
