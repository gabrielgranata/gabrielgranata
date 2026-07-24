import { useSyncExternalStore } from 'react'
import Site from './Site.jsx'
import Lab from './lab/Lab.jsx'
import WritingPage from './writing/WritingPage.jsx'
import TalksPage from './talks/TalksPage.jsx'

/*
  Hash routing, deliberately primitive: #lab opens the experiments lab,
  #writing opens the blog, anything else is the site. Real routing
  (react-router) waits until the hash outgrows us — it needs no
  dependency and no server.
*/
function subscribe(onChange) {
  window.addEventListener('hashchange', onChange)
  return () => window.removeEventListener('hashchange', onChange)
}

function getSnapshot() {
  return window.location.hash
}

export default function Root() {
  const hash = useSyncExternalStore(subscribe, getSnapshot)
  if (hash.startsWith('#lab')) return <Lab hash={hash} />
  if (hash.startsWith('#writing')) return <WritingPage hash={hash} />
  if (hash.startsWith('#talks')) return <TalksPage hash={hash} />
  return <Site />
}
