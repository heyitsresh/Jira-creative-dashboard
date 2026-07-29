import { useEffect, useRef, useState } from "react";

// Animates a displayed number counting up/down from whatever it last
// showed to `target` whenever it changes, instead of snapping straight to
// the new value. Non-numeric targets pass through unchanged.
export default function useCountUp(target, duration = 500) {
  const [display, setDisplay] = useState(typeof target === "number" ? target : 0);
  const fromRef = useRef(display);
  const rafRef = useRef(null);

  useEffect(() => {
    if (typeof target !== "number") {
      setDisplay(target);
      return;
    }
    const from = fromRef.current;
    if (from === target) return;
    const start = performance.now();

    function tick(now) {
      const progress = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - progress, 3);
      const current = Math.round(from + (target - from) * eased);
      setDisplay(current);
      if (progress < 1) {
        rafRef.current = requestAnimationFrame(tick);
      } else {
        fromRef.current = target;
      }
    }
    rafRef.current = requestAnimationFrame(tick);
    return () => rafRef.current && cancelAnimationFrame(rafRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target, duration]);

  return display;
}
