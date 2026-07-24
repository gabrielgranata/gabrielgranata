import { posts } from '../writing/posts.js'
import PostMedia from './PostMedia.jsx'

/*
  FrontPage — the newspaper strip on the home page: the most recent
  posts as cards, each with a media box, a title, a date, and a preview
  of the text. Mounted above the tabs in Site.jsx; moving it is a
  one-line change there.

  HOW TO READ THIS FILE
  §1 · the media slot — what fills the top of a card
  §2 · the preview — how body text becomes card text
  §3 · the cards themselves

  §1 · The media slot — resolution order (registry component →
      frontmatter image → nothing) lives in PostMedia.jsx, shared with
      the article page so both surfaces always agree on what a post's
      media IS. Here it gets card geometry: the "card-media" class is a
      fixed 3:2 box, so a component dropped in later inherits a stable
      canvas.

/*
  §2 · The preview prefers words Gabriel wrote FOR the card — an
  optional `description:` line in the post's frontmatter — and only
  derives one (first paragraph, CSS-clamped to three lines) when no
  description exists. Authored beats derived; derived beats empty.
*/
function previewText(post) {
  return post.description ?? post.body.split(/\n\s*\n/)[0]
}

/* §3 · How many stories the front page leads with — a visible knob. */
const RECENT_COUNT = 3

export default function FrontPage() {
  const recent = posts.slice(0, RECENT_COUNT)
  if (recent.length === 0) return null

  return (
    <section className="card-grid front-page" aria-label="recent posts">
      {recent.map(post => (
        <a key={post.slug} className="post-card" href={`#writing/${post.slug}`}>
          <PostMedia post={post} className="card-media" />
          <div className="card-text">
            <span className="card-title">{post.title}</span>
            <span className="card-date">
              {post.date}
              {post.status === 'draft' && <span className="card-draft">draft</span>}
            </span>
            <p className="card-preview">{previewText(post)}</p>
          </div>
        </a>
      ))}
    </section>
  )
}
