import { focusUrlInput } from '../lib/focusUrl'
import { Words } from './Words'
import './Close.css'

export function Close() {
  return (
    <section className="section close" id="start">
      <div className="close__glow" aria-hidden="true" />

      <div className="container close__inner">
        <h2 className="close__title">
          <span className="bloom close__line">
            <Words>It ships Monday.</Words>
          </span>
          <span className="bloom--teal close__line">
            <Words delay={220}>You have tonight.</Words>
          </span>
        </h2>

        <button
          type="button"
          className="btn btn--primary btn--lg close__cta"
          onClick={focusUrlInput}
        >
          Paste your URL
        </button>
      </div>
    </section>
  )
}
