/*
  TalkCard — one talk as a newspaper card, used by the talks tab and
  by the front page (for talks marked `featured` in site.js). Same
  visual contract as the post cards; the "talk" prefix in the dateline
  is what tells the two kinds apart on a mixed surface.
*/
export default function TalkCard({ talk }) {
  return (
    <a className="post-card" href={`#talks/${talk.slug}`}>
      {talk.image && (
        <div className="card-media">
          <img src={talk.image} alt="" />
        </div>
      )}
      <div className="card-text">
        <span className="card-title">{talk.title}</span>
        <span className="card-date">talk · {talk.date}</span>
      </div>
    </a>
  )
}
