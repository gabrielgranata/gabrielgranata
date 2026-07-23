import { useTrail } from '@react-spring/web'
import { FEEL, usePrefersReducedMotion } from '../motion.js'
import { entries } from '../data/site.js'
import Entry from './Entry.jsx'

/*
  useTrail gives each entry a spring that follows the one before it — the
  stagger is the physics chaining, not hand-tuned delays.
*/
export default function Feed() {
  const reducedMotion = usePrefersReducedMotion()

  const trail = useTrail(entries.length, {
    from: { opacity: 0, y: 14 },
    to: { opacity: 1, y: 0 },
    config: FEEL,
    immediate: reducedMotion,
  })

  return (
    <section className="feed" aria-label="feed">
      {/* visible name lives in the tab strip now */}
      <ul className="feed-list">
        {trail.map((style, i) => (
          <Entry key={entries[i].title} entry={entries[i]} style={style} />
        ))}
      </ul>
    </section>
  )
}
