import Markdown from './markdown.jsx'
import { posts, postBySlug } from './posts.js'

/*
  The writing pages, behind #writing (index) and #writing/<slug> (one post).
  Same primitive hash routing as the lab — no router until the site needs one.
*/
export default function WritingPage({ hash }) {
  const slug = hash.split('/')[1]
  const post = slug ? postBySlug(slug) : null

  return (
    <main className="writing-page">
      <nav className="lab-nav">
        <a href="#">← site</a>
        <a href="#writing">writing</a>
      </nav>

      {post ? (
        <article className="post">
          <h1 className="post-title">{post.title}</h1>
          <p className="post-meta">
            {post.date}
            <span className="experiment-open"> · {post.status}</span>
            {post.confidence && <span> · confidence: {post.confidence}</span>}
            {post.importance && <span> · importance: {post.importance}</span>}
          </p>
          <div className="post-body">
            <Markdown text={post.body} />
          </div>
        </article>
      ) : (
        <ul className="lab-list">
          {posts.map(p => (
            <li key={p.slug}>
              <a href={`#writing/${p.slug}`}>{p.title}</a>
              <span className="lab-note">{p.date}</span>
              {p.status === 'draft' && <span className="experiment-open">draft</span>}
            </li>
          ))}
        </ul>
      )}
    </main>
  )
}
