import { identity } from '../data/site.js'
import PendingText from './PendingText.jsx'

export default function Header() {
  return (
    <header className="header">
      <h1 className="name">{identity.name}</h1>

      <p className="positioning">
        {identity.positioning} <span className="pend">[draft]</span>
      </p>

      <p className="intro">
        <PendingText text={identity.intro} />
      </p>

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
    </header>
  )
}
