import { focusUrlInput } from '../lib/focusUrl'
import { Words } from './Words'
import './Pricing.css'

const INCLUDED = [
  'Unlimited drafts',
  'Every aspect ratio',
  'Captions + brand kit',
  'Watermark-free exports',
]

export function Pricing() {
  return (
    <section className="section pricing" id="pricing">
      <div className="container pricing__inner">
        <p className="kicker">Pricing</p>

        <h2 className="pricing__title bloom">
          <Words>Free while we're early.</Words>
        </h2>

        <div className="pricing__card panel">
          <span className="pricing__tag">Early access</span>

          <p className="pricing__amount">
            <b>$0</b>
            <s>/ month</s>
          </p>

          <ul className="pricing__list">
            {INCLUDED.map((item) => (
              <li key={item}>
                <i aria-hidden="true" />
                {item}
              </li>
            ))}
          </ul>

          <button
            type="button"
            className="btn btn--primary btn--lg pricing__cta"
            onClick={focusUrlInput}
          >
            Start free
          </button>

          <p className="pricing__fine">
            No card. Paid plans arrive with general availability — you'll hear
            about it before anything changes.
          </p>
        </div>
      </div>
    </section>
  )
}
