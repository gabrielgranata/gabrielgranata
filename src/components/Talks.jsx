import { talks } from '../data/site.js'

/*
  Talks — the slide decks committed in talks/. Each row opens the
  in-site reader (#talks/<slug>), which runs the deck live in a frame;
  the raw document stays reachable from there via "open full screen".
*/
export default function Talks() {
  return (
    <section className="experiments" aria-label="talks">
      <ul className="experiments-list">
        {talks.map(t => (
          <li key={t.slug} className="experiment-row">
            <a href={`#talks/${t.slug}`}>{t.title}</a>
            <span className="lab-note">{t.date}</span>
          </li>
        ))}
      </ul>
    </section>
  )
}
