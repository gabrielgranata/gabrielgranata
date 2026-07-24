import { media } from '../writing/media.jsx'

/*
  PostMedia — what a post's media resolves to, decided ONCE and used by
  both surfaces that show it (the front-page card and the article page).

  Resolution order:
  1. an entry in writing/media.jsx — a React component (animation,
     gesture surface, instrument): the dynamic case
  2. the post's `image:` frontmatter — a file next to the .md that
     posts.js resolved to a bundled URL: the static case
  3. neither → renders nothing. A text-only post is a legitimate form
     (a brief), not an error state.

  Geometry belongs to the CALLER via className: the card passes
  "card-media" (fixed 3:2 box, cover-crop), the article passes
  "post-lead" (full column width, natural aspect). Same content,
  different frames — that split is why this component owns no sizing.
*/
export default function PostMedia({ post, className }) {
  const Dynamic = media[post.slug]
  if (Dynamic) {
    return (
      <div className={className}>
        <Dynamic post={post} />
      </div>
    )
  }
  if (post.imageUrl) {
    return (
      <div className={className}>
        {/* alt="" — presentational; the title names the story for
            screen readers on both surfaces */}
        <img src={post.imageUrl} alt="" />
      </div>
    )
  }
  return null
}
