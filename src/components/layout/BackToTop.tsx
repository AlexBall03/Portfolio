'use client';

import { useEffect, useState, type CSSProperties } from 'react';
import { Icon } from '@/components/ui/Icon';
import { cn } from '@/lib/cn';

/** A page "scrolls decently" when its content is at least this many viewports tall. */
const MIN_PAGES = 2;
/** Offered once the reader is this many viewports down. */
const SHOW_AFTER = 1;
/** Progress ring geometry (SVG user units): r = 15 → circumference ≈ 94.25. */
const RING_R = 15;
const RING_C = 2 * Math.PI * RING_R;

/**
 * Floating "back to top" control, offered only on long pages once the reader
 * has scrolled well down. A glass pill: a ring that fills with reading
 * progress around the arrow, and a short label from `sm` up. Scrolls smoothly
 * (instantly with reduced motion), then moves focus to the main content so
 * keyboard and screen-reader users land at the top too. Hidden, it is `inert`:
 * out of the tab order and the accessibility tree.
 */
export function BackToTop({ label, shortLabel }: { label: string; shortLabel: string }) {
  const [visible, setVisible] = useState(false);
  // Whole percent only, so scrolling re-renders at most ~100 times per page.
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    let raf = 0;
    const update = () => {
      raf = 0;
      const vh = window.innerHeight;
      const height = document.documentElement.scrollHeight;
      const long = height >= vh * MIN_PAGES;
      setVisible(long && window.scrollY > vh * SHOW_AFTER);
      const range = Math.max(1, height - vh);
      setProgress(Math.min(100, Math.max(0, Math.round((window.scrollY / range) * 100))));
    };
    const schedule = () => {
      if (!raf) raf = requestAnimationFrame(update);
    };
    // Content can grow after load (streamed sections, images), so watch the page height too.
    const resize = new ResizeObserver(schedule);
    resize.observe(document.body);
    window.addEventListener('scroll', schedule, { passive: true });
    window.addEventListener('resize', schedule);
    update();
    return () => {
      resize.disconnect();
      window.removeEventListener('scroll', schedule);
      window.removeEventListener('resize', schedule);
      cancelAnimationFrame(raf);
    };
  }, []);

  const toTop = () => {
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    window.scrollTo({ top: 0, behavior: reduced ? 'auto' : 'smooth' });
    document.getElementById('main')?.focus({ preventScroll: true });
  };

  return (
    <button
      type="button"
      onClick={toTop}
      aria-label={label}
      title={label}
      inert={!visible}
      className={cn(
        'back-to-top glass group fixed z-40 inline-flex h-12 items-center gap-2 rounded-full p-1 text-fg-muted sm:pr-4',
        'right-[calc(1rem+env(safe-area-inset-right,0px))] bottom-[calc(1rem+env(safe-area-inset-bottom,0px))]',
        'sm:right-[calc(1.5rem+env(safe-area-inset-right,0px))] sm:bottom-[calc(1.5rem+env(safe-area-inset-bottom,0px))]',
        'transition-[opacity,translate,color,border-color] duration-200 ease-standard hover:border-brand/45 hover:text-fg',
        'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus',
        visible ? 'translate-y-0 opacity-100' : 'pointer-events-none translate-y-3 opacity-0',
      )}
      style={{ '--progress': RING_C * (1 - progress / 100) } as CSSProperties}
    >
      <span className="relative grid size-10 shrink-0 place-items-center rounded-full bg-surface-inset/70 text-brand-fg">
        <svg aria-hidden="true" viewBox="0 0 36 36" className="absolute inset-0 size-full -rotate-90">
          <circle cx="18" cy="18" r={RING_R} fill="none" strokeWidth="2" className="stroke-line" />
          <circle
            cx="18"
            cy="18"
            r={RING_R}
            fill="none"
            strokeWidth="2"
            strokeLinecap="round"
            strokeDasharray={RING_C}
            className="back-to-top-ring stroke-brand"
          />
        </svg>
        <Icon
          name="arrowUp"
          className="relative size-4 transition-transform duration-200 ease-standard motion-safe:group-hover:-translate-y-0.5"
        />
      </span>
      <span aria-hidden="true" className="hidden font-mono text-micro tracking-[0.16em] uppercase sm:inline">
        {shortLabel}
      </span>
    </button>
  );
}
