import { posts } from '../writing/posts.js'

/*
  The writing section on the site: lists on-site posts, linking into
  #writing/<slug>. Substack essays remain feed entries; this section is
  for words that live here.
*/
export default function Writing() {
  return (
    // The tab strip carries this section's visible name; aria-label keeps
    // the accessible one now that the heading is gone.
    <section className="experiments" aria-label="writing">
      <ul className="experiments-list">
        {posts.map(p => (
          <li key={p.slug} className="experiment-row">
            <a href={`#writing/${p.slug}`}>{p.title}</a>
            <span className="lab-note">{p.date}</span>
            {p.status === 'draft' && <span className="experiment-open">draft</span>}
          </li>
        ))}
      </ul>
    </section>
  )
}
