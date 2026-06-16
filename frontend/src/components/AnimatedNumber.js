// frontend/src/components/AnimatedNumber.js
// Counts up from 0 to target value when it first mounts or value changes
import { useState, useEffect, useRef } from 'react';

/**
 * <AnimatedNumber value={1234.50} prefix="₹" decimals={2} duration={800} />
 * Renders the number counting up smoothly. Falls back to static display if
 * reduced-motion is preferred.
 */
export default function AnimatedNumber({
  value = 0,
  prefix = '',
  suffix = '',
  decimals = 0,
  duration = 700,
  style = {},
}) {
  const [display, setDisplay] = useState(0);
  const prevRef = useRef(0);
  const rafRef = useRef(null);

  const prefersReduced =
    typeof window !== 'undefined' &&
    window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

  useEffect(() => {
    const target = parseFloat(value) || 0;
    if (prefersReduced) { setDisplay(target); return; }

    const start = prevRef.current;
    const diff = target - start;
    if (diff === 0) return;

    const startTime = performance.now();

    const tick = (now) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      // ease-out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      const current = start + diff * eased;
      setDisplay(current);
      if (progress < 1) {
        rafRef.current = requestAnimationFrame(tick);
      } else {
        prevRef.current = target;
      }
    };

    rafRef.current = requestAnimationFrame(tick);
    return () => rafRef.current && cancelAnimationFrame(rafRef.current);
  }, [value, duration, prefersReduced]);

  const formatted = display.toFixed(decimals).replace(/\B(?=(\d{3})+(?!\d))/g, ',');

  return (
    <span style={style}>
      {prefix}{formatted}{suffix}
    </span>
  );
}
