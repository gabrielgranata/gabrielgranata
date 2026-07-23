import { useRef, useState } from 'react'
import { useSpring, animated } from '@react-spring/web'
import { FEEL, usePrefersReducedMotion } from '../motion.js'
import { receipts } from '../data/site.js'
import PendingText from './PendingText.jsx'

/*
  A receipt is a number that can back itself up: click the figure, the
  methodology springs open beneath it.

  Springs can't animate height: auto, so we measure the methodology text
  (offsetHeight — the collapsed parent clips it, but the child still has
  layout) right before opening and animate to that pixel value. Measuring at
  toggle time, not mount time, means the value is correct for the current
  viewport width. Known gap: resizing the window while a receipt is open can
  leave the measured height stale until the next toggle.
*/
function Receipt({ figure, label, method }) {
  const [open, setOpen] = useState(false)
  const [height, setHeight] = useState(0)
  const methodRef = useRef(null)
  const reducedMotion = usePrefersReducedMotion()

  const panel = useSpring({
    height: open ? height : 0,
    opacity: open ? 1 : 0,
    config: FEEL,
    immediate: reducedMotion,
  })

  function toggle() {
    if (!open) setHeight(methodRef.current.offsetHeight)
    setOpen(!open)
  }

  return (
    <div className="receipt">
      <button
        type="button"
        className="receipt-toggle"
        onClick={toggle}
        aria-expanded={open}
      >
        <span className="receipt-figure">{figure}</span>
        <span className="receipt-label">{label}</span>
      </button>
      <animated.div className="receipt-panel" style={panel} aria-hidden={!open}>
        <p ref={methodRef} className="receipt-method">
          <PendingText text={method} />
        </p>
      </animated.div>
    </div>
  )
}

export default function Receipts() {
  return (
    <div className="receipts">
      {receipts.map((r) => (
        <Receipt key={r.label} {...r} />
      ))}
    </div>
  )
}
