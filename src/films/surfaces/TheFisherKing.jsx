import { useSpring, animated } from '@react-spring/web'
import { useDrag } from '@use-gesture/react'
import { FEEL } from '../../motion.js'

/*
  The Fisher King (1991) — surface.

  CURRENT BODY IS A PLACEHOLDER: the motion hello-world relocated into
  the diary entry, proving the socket works. Same one-writer split as
  always — React owns nothing here; the spring owns the dot's position.
  Pointer down: the dot follows the hand exactly (immediate: down — no
  physics between finger and object). Release: the spring carries it
  home through FEEL.

  Replacing this body with what the film actually left behind is the
  point of the mechanism.
*/
export default function TheFisherKing({ entry }) {
  const [{ x, y }, api] = useSpring(() => ({ x: 0, y: 0, config: FEEL }))

  const bindDrag = useDrag(({ down, movement: [mx, my] }) => {
    api.start({ x: down ? mx : 0, y: down ? my : 0, immediate: down })
  })

  return (
    <div className="film-surface">
      <animated.div className="film-surface-dot" {...bindDrag()} style={{ x, y }} />
      <p className="pend">
        surface demo — the socket works; {entry.title} still awaits its expression
      </p>
    </div>
  )
}
