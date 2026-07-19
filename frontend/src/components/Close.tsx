import { Words } from './Words'
import './Close.css'

export function Close() {
  return (
    <section className="section close" id="start">
      <div className="close__glow" aria-hidden="true" />

      <div className="container close__inner">
        <h2 className="close__title">
          <Words className="bloom close__line">It ships Monday.</Words>
          <Words className="bloom--teal close__line" delay={220}>
            You have tonight.
          </Words>
        </h2>

        <a className="btn btn--primary btn--lg close__cta" href="#top">
          Paste your URL
        </a>
      </div>
    </section>
  )
}
