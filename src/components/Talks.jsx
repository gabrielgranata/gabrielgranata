import { talks } from '../data/site.js'
import TalkCard from './TalkCard.jsx'

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
        <TalkCard key={t.slug} talk={t} />
      ))}
    </section>
  )
}
