import { identity } from '../data/site.js'
import PendingText from './PendingText.jsx'

export default function Header() {
  return (
    <header className="header">
      {/* name and links share one row; the links ride beside the name
          like a small annotation — their height is a CSS knob */}
      <div className="name-row">
        <h1 className="name">{identity.name}</h1>
        <ul className="contact">
        {identity.contact.map(({ label, href, note }) => (
          <li key={label}>
            {href ? (
              <a href={href} target="_blank" rel="noreferrer">
                {label} ↗
              </a>
            ) : (
              <span>
                {label} <span className="pend">{note}</span>
              </span>
            )}
          </li>
        ))}
        </ul>
      </div>

      {/* positioning is Gabriel's authored text; if a run of it is still
          pending he writes [brackets] and PendingText renders the chip —
          draftness is content state, never hardcoded here */}
      <p className="positioning">
        <PendingText text={identity.positioning} />
      </p>

      {identity.positioningClose && (
        <p className="positioning-close">
          <PendingText text={identity.positioningClose} />
        </p>
      )}

      <p className="intro">
        <PendingText text={identity.intro} />
      </p>
    </header>
  )
}
