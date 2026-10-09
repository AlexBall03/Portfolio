'use client';

import { useEffect, useState } from 'react';
import { Icon } from '@/components/ui/Icon';
import { cn } from '@/lib/cn';

/** A page "scrolls decently" when its content is at least this many viewports tall. */
const MIN_PAGES = 2;
/** Offered once the reader is this many viewports down. */
const SHOW_AFTER = 1;

/**
 * Floating "back to top" control, offered only on long pages once the reader
 * has scrolled well down. Scrolls smoothly (instantly with reduced motion),
 * then moves focus to the main content so keyboard and screen-reader users
 * land at the top too. Hidden, it is `inert`: out of the tab order and the
 * accessibility tree.
 */
export function BackToTop({ label }: { label: string }) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    let raf = 0;
    const update = () => {
      raf = 0;
      const vh = window.innerHeight;
      const long = document.documentElement.scrollHeight >= vh * MIN_PAGES;
      setVisible(long && window.scrollY > vh * SHOW_AFTER);
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
        'glass-strong fixed right-4 bottom-[max(1rem,env(safe-area-inset-bottom))] z-40 inline-flex size-11 items-center justify-center rounded-full text-fg-muted sm:right-6 sm:bottom-6',
        'transition-[opacity,translate,color] duration-200 ease-standard hover:text-fg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus [&_svg]:size-5',
        visible ? 'translate-y-0 opacity-100' : 'pointer-events-none translate-y-3 opacity-0',
      )}
    >
      <Icon name="arrowUp" />
    </button>
  );
}
