'use client';

import { useEffect, useState } from 'react';
import { useInView } from '@/lib/client/in-view';

interface CountUpProps {
  value: number;
  durationMs?: number;
  className?: string;
  suffix?: string;
  suffixClassName?: string;
}

const reducedMotion = () =>
  typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/**
 * Counts from 0 to `value` when scrolled into view. Server-rendered with the
 * final value, so it is correct without JavaScript and under reduced motion.
 */
export function CountUp({ value, durationMs = 1400, className, suffix, suffixClassName }: CountUpProps) {
  const [ref, inView] = useInView<HTMLSpanElement>();
  const [progress, setProgress] = useState<number | null>(null);
  const decimals = Number.isInteger(value) ? 0 : 1;

  useEffect(() => {
    if (!inView || reducedMotion()) return;
    let frame = 0;
    const start = performance.now();
    const tick = (now: number) => {
      const p = Math.min(1, (now - start) / durationMs);
      setProgress(1 - Math.pow(1 - p, 3));
      if (p < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [inView, durationMs]);

  const shown = progress === null ? value : value * progress;
  return (
    <span ref={ref} className={className}>
      {shown.toFixed(decimals)}
      {suffix && <span className={suffixClassName}>{suffix}</span>}
    </span>
  );
}
