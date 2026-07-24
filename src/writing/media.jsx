/*
  media.jsx — per-post media slots for the front-page cards. Same idiom
  as films/surfaces.jsx: a pure-data registry mapping post slugs to
  components, no components defined here (Fast Refresh needs a file to
  export only components, or none).

  Most posts want a static picture — that's `image:` frontmatter in the
  post itself, not this file. Map a post here when its card should hold
  something ALIVE: an animation, a gesture surface, an instrument. The
  component receives the full post as a prop and renders inside the
  card's fixed media box (the box is the contract; the content is free).

  Conventions:
  - one post's media = one file in ./media/
  - the key is the post's slug (its filename without .md)
  - what a post's media IS — image or instrument — is Gabriel's call

  Example, once a component exists:

    import Spaceman from './media/Spaceman.jsx'
    export const media = {
      'building-this-site-with-ai': Spaceman,
    }
*/
export const media = {}
