/*
  surfaces.jsx — per-film expressive surfaces. A registry, same idiom
  as lab/registry.js: pure data mapping names to components, no
  components defined here (that separation is what keeps Fast Refresh
  working — a file must export only components, or none).

  The idea: most diary entries render as the plain list row in
  Films.jsx. But sometimes a film leaves something behind that wants
  its own expression — an animation, a color, a shape, a texture.
  Map the film here and Films.jsx renders its component inside the
  entry, passing the full entry as a prop.

  Conventions:
  - one film's expression = one file in surfaces/
  - the key is human-writable: "Title (Year)", exactly as the diary
    shows it
  - a surface can use anything the lab uses — react-spring, gestures,
    SVG, the FEEL constant from src/motion.js

  What a film gets expressed AS is Gabriel's call, never scaffold.
*/
import TheFisherKing from './surfaces/TheFisherKing.jsx'

export const surfaces = {
  'The Fisher King (1991)': TheFisherKing,
}
