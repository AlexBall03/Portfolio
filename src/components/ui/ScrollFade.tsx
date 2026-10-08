'use client';

import { type ReactNode, useEffect, useRef, useState } from 'react';
import { cn } from '@/lib/cn';

/** Sub-pixel slack, so a list scrolled to its end never keeps a sliver of fade. */
const EPSILON = 1;

/**
 * A vertical scroller with a hidden scrollbar that fades whichever edge has
 * more content past it (`.scroll-fade` in system.css), so it reads as
 * scrollable without a scrollbar. No fade when everything fits.
 */
export function ScrollFade({ className, children }: { className?: string; children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const [edges, setEdges] = useState({ top: false, bottom: false });

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    let raf = 0;
    const update = () => {
      raf = 0;
      const top = el.scrollTop > EPSILON;
      const bottom = el.scrollHeight - el.clientHeight - el.scrollTop > EPSILON;
      setEdges((prev) => (prev.top === top && prev.bottom === bottom ? prev : { top, bottom }));
    };
    const schedule = () => {
      if (!raf) raf = requestAnimationFrame(update);
    };
    el.addEventListener('scroll', schedule, { passive: true });
    // The viewport (the scroller's own size) and the content can each change.
    const ro = new ResizeObserver(schedule);
    ro.observe(el);
    if (el.firstElementChild) ro.observe(el.firstElementChild);
    update();
    return () => {
      el.removeEventListener('scroll', schedule);
      ro.disconnect();
      cancelAnimationFrame(raf);
    };
  }, []);

  return (
    <div
      ref={ref}
      data-fade-top={edges.top || undefined}
      data-fade-bottom={edges.bottom || undefined}
      className={cn('scroll-fade min-h-0 overflow-y-auto overscroll-contain [scrollbar-width:none]', className)}
    >
      {children}
    </div>
  );
}
