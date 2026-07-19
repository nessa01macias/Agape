import type { ReactNode } from 'react'
import { usePointerLight } from '../hooks/usePointerLight'
import { Words } from './Words'
import './Bento.css'

type CardProps = {
  className?: string
  big: string
  note: string
  children: ReactNode
}

function Card({ className = '', big, note, children }: CardProps) {
  const ref = usePointerLight<HTMLElement>()

  return (
    <article className={`bento__card ${className}`} ref={ref}>
      <div className="bento__demo" aria-hidden="true">
        {children}
      </div>
      <h3 className="bento__big bloom">
        <Words>{big}</Words>
      </h3>
      <p className="bento__note">{note}</p>
    </article>
  )
}

export function Bento() {
  return (
    <section className="section bento" id="what">
      <div className="container">
        <h2 className="bento__title bloom">
          <Words>Everything it hands you.</Words>
        </h2>

        <div className="bento__grid">
          <Card className="bento__card--wide" big="Captions" note="Word-perfect, on brand.">
            <div className="cap">
              {['ship', 'it', 'tonight'].map((word, i) => (
                <span className="cap__w" key={word} style={{ animationDelay: `${i * 0.42}s` }}>
                  {word}
                </span>
              ))}
            </div>
          </Card>

          <Card big="Brand kit" note="Lifted straight off your URL.">
            <div className="kit">
              {['#A9FF67', '#F4DB5E', '#25454A', '#FFFFFF'].map((hex, i) => (
                <span
                  className="kit__dot"
                  key={hex}
                  style={{ background: hex, animationDelay: `${i * 0.16}s` }}
                />
              ))}
            </div>
          </Card>

          <Card big="Vertical" note="9:16, subject tracked.">
            <div className="ratio">
              <span className="ratio__box" />
            </div>
          </Card>

          <Card big="12 variants" note="One prompt, twelve hooks.">
            <div className="variants">
              {Array.from({ length: 12 }, (_, i) => (
                <span className="variants__cell" key={i} style={{ animationDelay: `${i * 0.11}s` }} />
              ))}
            </div>
          </Card>

          <Card big="B-roll" note="Found on your own site.">
            <div className="broll">
              <span className="broll__sheet" />
              <span className="broll__sheet" />
              <span className="broll__sheet" />
            </div>
          </Card>
        </div>
      </div>
    </section>
  )
}
