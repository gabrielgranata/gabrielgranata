import { useSyncExternalStore } from 'react'

/*
  The site's single motion constant, carried over from the MotionHello
  exercise. Placeholder feel — tune it in one place when the site earns
  its own character.
    tension  = spring stiffness (pull toward the target)
    friction = resistance (how fast motion bleeds away)
*/
export const FEEL = { tension: 300, friction: 20 }

/*
  prefers-reduced-motion, as React state. matchMedia is a store that lives
  outside React, so useSyncExternalStore is the idiomatic bridge: subscribe
  to its change event, snapshot its current value. Springs then pass
  `immediate: true` to skip animation without branching the render.
*/
const QUERY = '(prefers-reduced-motion: reduce)'

function subscribe(onChange) {
  const mql = window.matchMedia(QUERY)
  mql.addEventListener('change', onChange)
  return () => mql.removeEventListener('change', onChange)
}

function getSnapshot() {
  return window.matchMedia(QUERY).matches
}

export function usePrefersReducedMotion() {
  return useSyncExternalStore(subscribe, getSnapshot)
}
