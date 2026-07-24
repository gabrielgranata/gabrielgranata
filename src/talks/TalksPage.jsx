import { useEffect } from 'react'
import { talks } from '../data/site.js'

/*
  TalksPage — behind #talks (index) and #talks/<slug> (one deck).
  Same primitive hash routing as writing.

  The reader is site chrome around the RUNNING deck. Each deck is a
  self-contained document that already knows how to page itself
  (talk 1 is reveal.js; talk 2 carries its own keydown handler), so
  the site renders it live in an <iframe> instead of re-parsing its
  slides into React — fidelity over ownership: the deck keeps its own
  styles, fonts, and navigation, and the site only provides the frame.

  The one contract an iframe imposes: keyboard events go to whichever
  document has focus. Click the deck once and ← → belong to it.
*/
export default function TalksPage({ hash }) {
  const slug = hash.split('/')[1]
  // resolve by the current slug OR any address ever published (the
  // aliases ledger in site.js) — published links are a contract
  const talk = slug
    ? talks.find(t => t.slug === slug || t.aliases?.includes(slug))
    : null

  // canonicalize: reached via an old address → rewrite the address bar
  // to the current one. location.replace swaps the history entry, so
  // the back button never lands on the stale address.
  useEffect(() => {
    if (talk && slug !== talk.slug) {
      window.location.replace(`#talks/${talk.slug}`)
    }
  }, [talk, slug])

  return (
    <main className="writing-page">
      <nav className="lab-nav">
        <a href="#">← site</a>
        <a href="#talks">talks</a>
      </nav>

      {talk ? (
        <article className="talk-reader">
          <h1 className="post-title">{talk.title}</h1>
          <p className="post-meta">
            {talk.date} · <a href={talk.href}>open full screen ↗</a>
          </p>
          <iframe className="talk-frame" src={talk.href} title={talk.title} />
          <p className="pend">
            click the deck once, then ← → moves through the slides
          </p>
        </article>
      ) : (
        <ul className="lab-list">
          {talks.map(t => (
            <li key={t.slug}>
              <a href={`#talks/${t.slug}`}>{t.title}</a>
              <span className="lab-note">{t.date}</span>
            </li>
          ))}
        </ul>
      )}
    </main>
  )
}
