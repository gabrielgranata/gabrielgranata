import { useState } from 'react'
import Header from './components/Header.jsx'
import FrontPage from './components/FrontPage.jsx'
import Tabs from './components/Tabs.jsx'
import Writing from './components/Writing.jsx'
import Experiments from './components/Experiments.jsx'
// films & feed are off the public build for now (Gabriel's call,
// 2026-07-24) — re-enable by uncommenting here and in TABS below.
// import Feed from './components/Feed.jsx'
// import Films from './films/Films.jsx'

/*
  The homepage: identity persists on top; below it, one section at a time
  behind tabs. (Previously all three sections scrolled in sequence — see
  docs/2026-07-19-site-design.md, a sketch, not a contract.)

  §1 · TABS is a registry — the same idiom as lab/registry.js: components
      stored as data, picked by id. Order and labels are carried over from
      the scrolled page unchanged; reordering, renaming, and the default
      tab are taste calls. [Gabriel's call: labels · order · default]

  §2 · Site owns the active tab — one writer. useState, not the hash,
      because #writing and #lab already route to full pages in Root.jsx;
      tab state stays local until deep-linking earns a hash grammar of
      its own. Stated cost: reload and back-button land on the default.

  §3 · Switching tabs unmounts the old panel and mounts the new one.
      That's why Feed's entrance trail replays on every visit — the
      trail runs on mount, and mounting is what a tab switch does.
*/
const TABS = [
  { id: 'writing', label: 'writing', Panel: Writing },
  { id: 'experiments', label: 'experiments', Panel: Experiments },
  // { id: 'feed', label: 'feed', Panel: Feed },
  // { id: 'films', label: 'films', Panel: Films },
]

export default function Site() {
  const [activeId, setActiveId] = useState(TABS[0].id)
  const { Panel } = TABS.find(t => t.id === activeId)

  return (
    <div className="site">
      <Header />
      {/* recent posts as newspaper cards — placement above the tabs is
          the front-page reading of "home page"; moving it is this line */}
      <FrontPage />
      <Tabs tabs={TABS} activeId={activeId} onSelect={setActiveId} />
      <Panel />
    </div>
  )
}
