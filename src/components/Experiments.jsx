import { EXPERIMENTS } from '../lab/registry.js'

/*
  The experiments section: the lab, surfaced on the site. Each row links
  into the live experiment (#lab/<id>) — visitors see the same playground
  the site is being built through.
*/
export default function Experiments() {
  return (
    // The tab strip carries this section's visible name; aria-label keeps
    // the accessible one now that the heading is gone.
    <section className="experiments" aria-label="experiments">
      <ul className="experiments-list">
        {EXPERIMENTS.map(e => (
          <li key={e.id} className="experiment-row">
            <a href={`#lab/${e.id}`}>{e.title}</a>
            <span className="lab-note">{e.note}</span>
            {e.status === 'open' && <span className="experiment-open">open</span>}
          </li>
        ))}
      </ul>
    </section>
  )
}
