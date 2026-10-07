'use client';

import { usePathname } from 'next/navigation';
import { useEffect, useSyncExternalStore, type CSSProperties } from 'react';
import {
  finishNavigationProgress,
  getProgress,
  getServerProgress,
  isTrackableClick,
  startNavigationProgress,
  subscribeProgress,
} from '@/lib/client/navigation-progress';

/**
 * The hairline loading bars above the command bar: one for the initial page
 * load (driven by the inline boot script's `--boot`, shown when the splash is
 * skipped) and one for client-side navigations.
 */
export function NavigationProgress() {
  const pathname = usePathname();
  const { phase, value } = useSyncExternalStore(subscribeProgress, getProgress, getServerProgress);

  useEffect(() => {
    finishNavigationProgress();
  }, [pathname]);

  useEffect(() => {
    // Capture phase: <Link> calls preventDefault on its own click handler.
    const onClick = (e: MouseEvent) => {
      const a = e.target instanceof Element ? e.target.closest('a[href]') : null;
      if (!(a instanceof HTMLAnchorElement)) return;
      if (isTrackableClick(e, { href: a.href, target: a.target, download: a.hasAttribute('download') }, location)) {
        startNavigationProgress();
      }
    };
    document.addEventListener('click', onClick, true);
    return () => document.removeEventListener('click', onClick, true);
  }, []);

  return (
    <>
      <div aria-hidden="true" className="load-bar boot-bar" />
      <div aria-hidden="true" className="load-bar nav-progress" data-phase={phase} style={{ '--p': value } as CSSProperties} />
    </>
  );
}
