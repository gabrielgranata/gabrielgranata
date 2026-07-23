/*
  Tabs.jsx — the tab strip. How to read this file: §1 is the one concept,
  §2 is the component that uses it. ~30 lines total.

  ── §1 · concept: a controlled component ─────────────────────────────
  This strip has no state. It receives which tab is active (`activeId`)
  and a callback (`onSelect`), renders one button per tab, and reports
  clicks upward. React calls this a "controlled component": the value
  lives in exactly one place — the parent, Site.jsx — and this file is a
  pure function of it. One writer, same rule as everywhere else. If the
  strip also kept its own copy of "which tab", two owners could disagree
  and the screen would lie about the state.

  Accessibility, decided rather than deferred: these are plain <button>s
  with aria-current — NOT role="tab". The full WAI-ARIA tabs pattern
  bundles the role with a keyboard contract (arrow keys move between
  tabs); claiming the role without honoring the contract is worse than
  staying plain. Graduating to the real pattern is a known later step.
*/
export default function Tabs({ tabs, activeId, onSelect }) {
  return (
    <nav className="tabs" aria-label="site sections">
      {tabs.map(({ id, label }) => (
        <button
          key={id}
          type="button"
          className={id === activeId ? 'tab on' : 'tab'}
          aria-current={id === activeId || undefined}
          onClick={() => onSelect(id)}
        >
          {label}
        </button>
      ))}
    </nav>
  )
}
