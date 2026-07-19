import { Words } from './Words'
import './Founders.css'

/**
 * Roles stay factual — the story is told in the first person plural, about
 * us as a team. Each card is also the contact route: it opens LinkedIn.
 */
const FOUNDERS = [
  {
    name: 'Vili',
    role: 'Filmmaker',
    url: 'https://www.linkedin.com/in/vili-haapaniemi-96b324227/',
  },
  {
    name: 'Kat',
    role: 'Designer, RISD',
    url: 'https://www.linkedin.com/in/kattch/',
  },
  { name: 'Tai', role: 'Founder', url: 'https://www.linkedin.com/in/tranchitai/' },
  {
    name: 'Alice',
    role: 'Founder',
    url: 'https://www.linkedin.com/in/zeyualicepeng/',
  },
  {
    name: 'Melany',
    role: 'Founder',
    url: 'https://www.linkedin.com/in/melanymacias/',
  },
]

export function Founders() {
  return (
    <section className="section founders" id="founders">
      <div className="container founders__inner">
        <p className="kicker">Why us</p>

        <h2 className="founders__title bloom">
          <Words>We shipped late. Every time.</Words>
        </h2>

        <div className="founders__story">
          <p>
            It was always the same Thursday. The launch was Monday, nobody on the
            team owned video, and at 11pm someone opened a timeline editor and
            started nudging keyframes.
          </p>
          <p className="founders__turn">
            We didn't need a better editor. We needed to not open one.
          </p>
        </div>

        <p className="founders__fit">
          So we put the craft in the room with the deadline — a filmmaker, a RISD
          designer, and three founders who kept missing it.
        </p>

        <ul className="founders__grid">
          {FOUNDERS.map((person) => (
            <li key={person.url}>
              <a
                className="fdr"
                href={person.url}
                target="_blank"
                rel="noreferrer noopener"
              >
                <span className="fdr__face" aria-hidden="true">
                  {person.name.charAt(0)}
                </span>
                <span className="fdr__name">{person.name}</span>
                <span className="fdr__role">{person.role}</span>

                <span className="fdr__in">
                  <svg viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M6.94 5a1.94 1.94 0 1 1-3.88 0 1.94 1.94 0 0 1 3.88 0ZM3.3 8.4h3.4V20H3.3V8.4Zm5.9 0h3.26v1.58h.05c.45-.86 1.56-1.77 3.22-1.77 3.44 0 4.08 2.27 4.08 5.22V20h-3.4v-5.87c0-1.4-.02-3.2-1.95-3.2-1.95 0-2.25 1.53-2.25 3.1V20H9.2V8.4Z" />
                  </svg>
                  <i>LinkedIn</i>
                </span>
              </a>
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}
