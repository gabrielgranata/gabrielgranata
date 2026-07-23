import { useSpring, animated } from "@react-spring/web";
import { useDrag } from "@use-gesture/react";

/* Feel lives in these two numbers.
   tension  = spring stiffness (how hard it pulls toward the target)
   friction = resistance of the medium (how fast motion bleeds away) */
const FEEL = { tension: 300, friction: 20 };

export default function MotionHello() {
  const [{ x, y }, api] = useSpring(() => ({ x: 0, y: 0, config: FEEL }));

  const bind = useDrag(
    ({ down, offset: [ox, oy] }) => {
      if (down) {
        api.start({ x: ox, y: oy, immediate: true }); // gripped: 1:1, physics off
      } else {
        api.start({ x: 0, y: 0 }); // released: physics carry it home
      }
    },
    // measure from where the dot IS right now — makes a mid-flight grab seamless
    { from: () => [x.get(), y.get()] }
  );

  return (
    <main className="stage">
      <animated.div className="dot" {...bind()} style={{ x, y }} />
      <p className="hint">drag the dot and let go — then try grabbing it mid-flight</p>
    </main>
  );
}
