import { useMemo, useRef } from 'react'
import { animated, useSpring } from '@react-spring/web'
import { FEEL, usePrefersReducedMotion } from '../../motion.js'

/*
  Experiment 01 — field.

  The idea in one sentence: a grid of gentle randomness (a "noise
  field") acts like wind, and we drop points onto the canvas and let
  the wind comb them into lines.

  How to read this file, top to bottom:
    1 · seeded randomness — random numbers that repeat on purpose
    2 · smooth noise — randomness that varies gently across space
    3 · the drawing — walking points through the field (the art lives here)
    4 · the component — SVG, plus a spring that drifts under the pointer
*/

/* ── 1 · seeded randomness ─────────────────────────────────────────
   Math.random() gives different numbers every run, so a drawing made
   with it can never be reproduced. A *seeded* generator is a machine
   you wind up with one number (the seed); it then hands out an
   endless but fixed sequence. Same seed → same sequence → same
   drawing, forever. That determinism is the whole point: the code is
   the recipe, and the recipe is the receipt.

   The bit-shuffling inside is folklore — a known-good recipe named
   mulberry32, borrowed like a sourdough starter. You don't derive it;
   you use it. Only the contract matters: give a seed, get back a
   function that returns numbers in [0, 1). */
function seededRandom(seed) {
  return function () {
    seed |= 0
    seed = (seed + 0x6d2b79f5) | 0
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/* ── 2 · smooth noise ──────────────────────────────────────────────
   Raw randomness looks like TV static: neighbouring points share
   nothing. For anything organic — wind, water, terrain — we want the
   opposite: nearby points mostly agree, distant points differ. In
   graphics that material is called "noise".

   The recipe here (value noise):
     a) pin a fixed random value to every corner of an invisible grid
     b) anywhere between corners, blend the four surrounding values
   The result is a function you can ask "how strong is the field at
   (x, y)?" and the answer changes gently as you move. */

// Every grid corner needs its own random value that never changes.
// Mixing the corner's coordinates into the seed (the big primes just
// scatter the bits apart) gives each corner a different — but
// repeatable — value.
function valueAtCorner(seed, cornerX, cornerY) {
  return seededRandom((seed ^ (cornerX * 374761393) ^ (cornerY * 668265263)) | 0)()
}

// Straight-line blend: t=0 gives a, t=1 gives b, halfway gives halfway.
function lerp(a, b, t) {
  return a + (b - a) * t
}

// Like lerp's t, but eased at both ends (the classic "smoothstep"
// curve). Without it you'd see creases along the grid lines.
function ease(t) {
  return t * t * (3 - 2 * t)
}

function smoothNoise(seed, x, y) {
  // Which grid cell are we in, and how far into it (0..1 each way)?
  const left = Math.floor(x)
  const top = Math.floor(y)
  const acrossX = ease(x - left)
  const acrossY = ease(y - top)

  // The four fixed values at the corners around us.
  const topLeft = valueAtCorner(seed, left, top)
  const topRight = valueAtCorner(seed, left + 1, top)
  const bottomLeft = valueAtCorner(seed, left, top + 1)
  const bottomRight = valueAtCorner(seed, left + 1, top + 1)

  // Blend along the top edge, along the bottom edge, then between them.
  const topEdge = lerp(topLeft, topRight, acrossX)
  const bottomEdge = lerp(bottomLeft, bottomRight, acrossX)
  return lerp(topEdge, bottomEdge, acrossY)
}

/* ── 3 · the drawing ───────────────────────────────────────────────
   Change SEED and a different field exists. W × H is the canvas in
   SVG units (it scales to fit its container). */
const SEED = 20260719
const W = 640
const H = 360

/* One "weather cell" of the field spans about this many pixels.
   Walkers and the dot lattice MUST read the field at the same zoom,
   or the dots show a different wind than the walkers feel. */
const ZOOM = 120

/*
  The artistic core. Everything above is material; this decides what
  the drawing IS.

  Currently: 40 walkers start along the left edge and take 60 equal
  steps straight to the right — the field is drawn (see the dots) but
  IGNORED, which is why the result is a boring comb. The one edit
  that brings it to life is yours, below.
*/
function buildPaths() {
  const paths = []

  for (let walker = 0; walker < 40; walker++) {
    // Spread the walkers evenly down the left edge.
    let x = 20
    let y = (H / 41) * (walker + 1)

    // An SVG path string is just turtle instructions:
    // "M x y" = pen down here, each " L x y" = draw a line to here.
    let path = `M ${x.toFixed(1)} ${y.toFixed(1)}`

    for (let step = 0; step < 60; step++) {
      // The field bends each line up or down while the rightward march
      // stays constant — rain streaking across glass. (A full flow
      // field would let the field own the horizontal too:
      // x += Math.cos(angle) * stride, with no fixed x-step.)
      const strength = smoothNoise(SEED, x / ZOOM, y / ZOOM) // 0..1
      const angle = strength * Math.PI * 2 // 0..full turn
      y += Math.sin(angle) * 12
      x += 6

      path += ` L ${x.toFixed(1)} ${y.toFixed(1)}`
    }

    paths.push(path)
  }

  return paths
}

/* ── 4 · the component ───────────────────────────────────────────── */
export default function Field() {
  const reduced = usePrefersReducedMotion()
  const boxRef = useRef(null)

  // useMemo: build the drawing once and remember it, rather than
  // re-walking every walker on every render.
  const paths = useMemo(() => buildPaths(), [])

  // One spring, two values (dx, dy). Pointer moves retarget it; the
  // spring invents every in-between frame. FEEL is the site's shared
  // motion constant — tune it there, everything changes together.
  const [drift, api] = useSpring(() => ({ dx: 0, dy: 0, config: FEEL }))
  const onPointerMove = e => {
    const box = boxRef.current.getBoundingClientRect()
    api.start({
      dx: (e.clientX - box.left - box.width / 2) * 0.03,
      dy: (e.clientY - box.top - box.height / 2) * 0.03,
      immediate: reduced, // reduced motion: jump, don't glide
    })
  }

  // The dot lattice makes the invisible field visible: each dot's
  // radius is the field's strength at that spot. Where dots swell,
  // your walkers will turn hardest.
  const dots = []
  for (let y = 24; y < H; y += 32) {
    for (let x = 24; x < W; x += 32) {
      const strength = smoothNoise(SEED, x / ZOOM, y / ZOOM) // same zoom as the walkers
      dots.push(
        <circle key={`${x}-${y}`} cx={x} cy={y} r={0.6 + strength * 1.8} />
      )
    }
  }

  return (
    <div className="field" ref={boxRef} onPointerMove={onPointerMove}>
      <svg viewBox={`0 0 ${W} ${H}`}>
        <g className="field-dots">{dots}</g>
        <animated.g style={{ x: drift.dx, y: drift.dy }} className="field-lines">
          {paths.map((d, i) => (
            <path key={i} d={d} />
          ))}
        </animated.g>
      </svg>
    </div>
  )
}
