import { talks } from '../data/site.js'

/*
  Talks — the slide decks committed in talks/, shown as cards (the
  same idiom as the front-page post cards: media box, title, date).
  Each card opens the in-site reader (#talks/<id>), which runs the
  deck live in a frame; a talk without an image renders as a text
  brief, same rule as posts.
*/
export default function Talks() {
  return (
    <section className="card-grid talks" aria-label="talks">
      {talks.map(t => (
        <a key={t.slug} className="post-card" href={`#talks/${t.slug}`}>
          {t.image && (
            <div className="card-media">
              <img src={t.image} alt="" />
            </div>
          )}
          <div className="card-text">
            <span className="card-title">{t.title}</span>
            <span className="card-date">{t.date}</span>
          </div>
        </a>
      ))}
    </section>
  )
}
