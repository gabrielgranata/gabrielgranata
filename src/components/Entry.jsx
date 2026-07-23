import { animated } from '@react-spring/web'
import PendingText from './PendingText.jsx'

/*
  One feed entry. `style` comes from the Feed's trail so entries stagger in.
  A link with href: null renders as a visible pending placeholder instead of
  a dead anchor.
*/
export default function Entry({ entry, style }) {
  const { date, type, title, body, link } = entry
  return (
    <animated.li className="entry" style={style}>
      <p className="entry-meta">
        <span className="entry-type">{type}</span>
        <span className="entry-date">
          <PendingText text={date} />
        </span>
      </p>
      <h3 className="entry-title">{title}</h3>
      {body && (
        <p className="entry-body">
          <PendingText text={body} />
        </p>
      )}
      {link &&
        (link.href ? (
          <a className="entry-link" href={link.href} target="_blank" rel="noreferrer">
            {link.label} ↗
          </a>
        ) : (
          <span className="pend">[{link.label} — link pending]</span>
        ))}
    </animated.li>
  )
}
