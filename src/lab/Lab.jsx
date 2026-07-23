import { EXPERIMENTS } from './registry.js'

/*
  The lab: each experiment is one file in ./experiments, registered in
  registry.js. Open with #lab (list) or #lab/<id> (one experiment).
  Experiments are sketches — kept, killed, or graduated into the site.
*/

export default function Lab({ hash }) {
  const id = hash.split('/')[1]
  const active = EXPERIMENTS.find(e => e.id === id)

  return (
    <main className="lab">
      <nav className="lab-nav">
        <a href="#">← site</a>
        <a href="#lab">lab</a>
        {EXPERIMENTS.map(e => (
          <a key={e.id} href={`#lab/${e.id}`} className={active?.id === e.id ? 'on' : ''}>
            {e.title}
          </a>
        ))}
      </nav>

      {active ? (
        <active.Component />
      ) : (
        <ul className="lab-list">
          {EXPERIMENTS.map(e => (
            <li key={e.id}>
              <a href={`#lab/${e.id}`}>{e.title}</a>
              <span className="lab-note">{e.note}</span>
            </li>
          ))}
        </ul>
      )}
    </main>
  )
}
