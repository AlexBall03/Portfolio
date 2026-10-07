'use client';

import { type MouseEvent, type ReactNode, useEffect, useRef, useState } from 'react';
import { Icon } from '@/components/ui/Icon';
import { cn } from '@/lib/cn';
import { lockScroll, unlockScroll } from '@/lib/client/scroll-lock';
import { stagger } from './styles';

const iconButton =
  'inline-flex size-10 items-center justify-center rounded-md text-fg-muted transition-colors hover:bg-fg/[0.06] hover:text-fg [&_svg]:size-[18px]';

function useScrolled(threshold = 8) {
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    let raf = 0;
    const update = () => {
      raf = 0;
      setScrolled(window.scrollY > threshold);
    };
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(update);
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    update();
    return () => {
      window.removeEventListener('scroll', onScroll);
      cancelAnimationFrame(raf);
    };
  }, [threshold]);
  return scrolled;
}

/**
 * The console's chrome below `lg`: the public command bar and drawer,
 * one-for-one (same material, scroll state, sheet, stagger, and geometry, so
 * ✕ lands exactly where ☰ was). The drawer is a sibling of the bar, not a
 * child: the bar's backdrop-filter would otherwise trap the fixed sheet.
 * Focus moves in on open and back on close; Escape and the scrim close it;
 * the page doesn't scroll behind it; it is `inert` while closed.
 */
export function AdminTopBar({ brand, children }: { brand: ReactNode; children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const scrolled = useScrolled();
  const openerRef = useRef<HTMLButtonElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const close = () => setOpen(false);

  useEffect(() => {
    if (!open) return;
    const drawer = document.getElementById('admin-drawer');
    const opener = openerRef.current;
    closeRef.current?.focus();
    lockScroll();
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('keydown', onKey);
      unlockScroll();
      const active = document.activeElement;
      if (!active || active === document.body || drawer?.contains(active)) opener?.focus();
    };
  }, [open]);

  // Following a link inside the drawer closes it.
  const onDrawerClick = (e: MouseEvent) => {
    if ((e.target as Element).closest('a')) close();
  };

  return (
    <>
      <header data-scrolled={scrolled || undefined} className="chrome-bar sticky top-0 z-50 lg:hidden">
        <div className="flex h-16 items-center px-gutter">
          <div className="-mx-2.5 flex flex-1 items-center justify-between">
            {brand}
            <button
              ref={openerRef}
              type="button"
              aria-label="Open menu"
              aria-expanded={open}
              aria-controls="admin-drawer"
              onClick={() => setOpen(true)}
              className={iconButton}
            >
              <Icon name="menu" />
            </button>
          </div>
        </div>
      </header>

      <div
        aria-hidden="true"
        onClick={close}
        className={cn(
          'fixed inset-0 z-[60] bg-scrim transition-opacity duration-300 ease-standard lg:hidden',
          open ? 'opacity-100' : 'pointer-events-none opacity-0',
        )}
      />
      <div
        id="admin-drawer"
        role="dialog"
        aria-modal="true"
        aria-label="Admin menu"
        inert={!open}
        data-open={open || undefined}
        onClick={onDrawerClick}
        className="drawer fixed inset-y-0 right-0 z-[61] flex w-full flex-col overflow-y-auto sm:w-[26rem] lg:hidden"
      >
        {/* Same height and gutter as the bar, so ✕ lands exactly where ☰ was. */}
        <div className="flex h-16 shrink-0 items-center border-b border-line px-gutter">
          <div style={stagger(0)} className="drawer-item -mx-2.5 flex flex-1 items-center justify-between">
            {brand}
            <button ref={closeRef} type="button" aria-label="Close menu" onClick={close} className={iconButton}>
              <Icon name="x" />
            </button>
          </div>
        </div>
        <div className="flex flex-1 flex-col">{children}</div>
      </div>
    </>
  );
}
