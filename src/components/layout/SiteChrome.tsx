'use client';

import Link from 'next/link';
import { type CSSProperties, useCallback, useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { Container } from '@/components/ui/Container';
import { Icon } from '@/components/ui/Icon';
import { pageForPath } from '@/config/navigation';
import { cn } from '@/lib/cn';
import { useLocalelessPath } from '@/lib/client/locale';
import { lockScroll, unlockScroll } from '@/lib/client/scroll-lock';
import { BrandMark } from './BrandMark';
import { CommandPalette } from './CommandPalette';
import { controlStyles, LocaleSwitch, ThemeSwitch, ThemeToggle } from './Preferences';
import type { ChromeData } from './types';

const noop = () => () => {};
/** Cosmetic only: the shortcut handler accepts both modifiers. */
const useShortcutLabel = () =>
  useSyncExternalStore(
    noop,
    () => (/Mac|iPhone|iPad|iPod/.test(navigator.userAgent) ? '⌘K' : 'Ctrl K'),
    () => 'Ctrl K',
  );

function useScrolled(threshold = 24) {
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

/** Stagger index for `.drawer-item` (see system.css). */
const stagger = (i: number) => ({ '--i': i }) as CSSProperties;

const iconButton =
  'inline-flex size-10 items-center justify-center rounded-md text-fg-muted transition-colors hover:bg-fg/[0.06] hover:text-fg [&_svg]:size-[18px]';

/** Command bar, mobile drawer, and command palette (they share open/close state). */
export function SiteChrome({ data }: { data: ChromeData }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const scrolled = useScrolled();
  const shortcut = useShortcutLabel();
  const current = pageForPath(useLocalelessPath());
  const T = data.dict;

  const openPalette = useCallback(() => {
    setMenuOpen(false);
    setPaletteOpen(true);
  }, []);
  const closePalette = useCallback(() => setPaletteOpen(false), []);
  const closeMenu = () => setMenuOpen(false);
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const drawerCloseRef = useRef<HTMLButtonElement>(null);

  // Move focus into the drawer when it opens and back to the menu button when it
  // closes — unless focus already moved on (e.g. the palette took over).
  useEffect(() => {
    if (!menuOpen) return;
    const drawer = document.getElementById('mobile-drawer');
    const opener = menuButtonRef.current;
    drawerCloseRef.current?.focus();
    return () => {
      const active = document.activeElement;
      if (!active || active === document.body || drawer?.contains(active)) opener?.focus();
    };
  }, [menuOpen]);

  // Counted lock: the drawer can hand off to the palette within one commit.
  useEffect(() => {
    if (!menuOpen) return;
    lockScroll();
    return unlockScroll;
  }, [menuOpen]);

  useEffect(() => {
    if (!menuOpen) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setMenuOpen(false);
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [menuOpen]);

  const home = data.pages.find((p) => p.key === 'home');

  return (
    <>
      <header data-scrolled={scrolled || undefined} className="chrome-bar fixed inset-x-0 top-0 z-50">
        <Container>
          <nav aria-label={T.nav.primary} className="-mx-2.5 flex h-16 items-center gap-1">
            <Link
              href={home?.href ?? '/'}
              onClick={closeMenu}
              className="flex h-10 shrink-0 items-center rounded-md px-2.5 text-body"
            >
              <BrandMark text={data.brandMark} />
            </Link>
            <span aria-hidden="true" className="mx-1.5 hidden h-6 w-px bg-line-strong lg:block" />

            <ul className="hidden items-center gap-0.5 lg:flex">
              {data.pages.map((p) => {
                const active = current === p.key;
                return (
                  <li key={p.key}>
                    <Link
                      href={p.href}
                      aria-current={active ? 'page' : undefined}
                      className={cn(
                        'relative flex h-10 items-center rounded-md px-3 text-body-sm transition-colors hover:bg-fg/[0.05] hover:text-fg',
                        'after:absolute after:inset-x-3 after:bottom-1 after:h-0.5 after:rounded-full after:bg-brand after:transition-opacity',
                        active ? 'text-fg after:opacity-100' : 'text-fg-muted after:opacity-0',
                      )}
                    >
                      {p.label}
                    </Link>
                  </li>
                );
              })}
            </ul>

            <div className="ml-auto flex items-center gap-2">
              <button
                type="button"
                onClick={openPalette}
                aria-label={T.palette.open}
                aria-keyshortcuts="Meta+K Control+K"
                className={cn(iconButton, 'lg:hidden')}
              >
                <Icon name="search" />
              </button>
              {/* Wrapped, so `hidden` never competes with the controls' own display classes. */}
              <div className="hidden lg:flex">
                <button
                  type="button"
                  onClick={openPalette}
                  aria-label={T.palette.open}
                  aria-keyshortcuts="Meta+K Control+K"
                  className={cn(controlStyles, 'min-w-9 justify-center gap-2 px-2.5 hover:bg-fg/[0.06] [&_svg]:size-4')}
                >
                  <Icon name="search" />
                  <kbd aria-hidden="true" className="hidden font-mono text-micro uppercase xl:inline">
                    {shortcut}
                  </kbd>
                </button>
              </div>
              <div className="hidden items-center gap-2 lg:flex">
                <ThemeToggle t={T.toggles} />
                <div className="hidden xl:block">
                  <LocaleSwitch locale={data.locale} t={T.toggles} />
                </div>
              </div>
              <div className="lg:hidden">
                <button
                  type="button"
                  aria-label={T.nav.openMenu}
                  aria-expanded={menuOpen}
                  aria-controls="mobile-drawer"
                  ref={menuButtonRef}
                  onClick={() => setMenuOpen(true)}
                  className={iconButton}
                >
                  <Icon name="menu" />
                </button>
              </div>
            </div>
          </nav>
        </Container>
      </header>

      <div
        aria-hidden="true"
        onClick={closeMenu}
        className={cn(
          'fixed inset-0 z-[60] bg-scrim transition-opacity duration-300 ease-standard lg:hidden',
          menuOpen ? 'opacity-100' : 'pointer-events-none opacity-0',
        )}
      />
      <div
        id="mobile-drawer"
        role="dialog"
        aria-modal="true"
        aria-label={T.nav.menu}
        inert={!menuOpen}
        data-open={menuOpen || undefined}
        className="drawer fixed inset-y-0 right-0 z-[61] flex w-full flex-col overflow-y-auto sm:w-[26rem] lg:hidden"
      >
        {/* Same height and gutter as the command bar, so ✕ lands exactly where ☰ was. */}
        <div className="flex h-16 shrink-0 items-center border-b border-line px-gutter">
          <div style={stagger(0)} className="drawer-item -mx-2.5 flex flex-1 items-center justify-between">
            <BrandMark text={data.brandMark} className="px-2.5 text-body" />
            <button ref={drawerCloseRef} type="button" aria-label={T.nav.closeMenu} onClick={closeMenu} className={iconButton}>
              <Icon name="x" />
            </button>
          </div>
        </div>

        {/* Wrapped, so the button's own `transition-colors` doesn't override the stagger. */}
        <div style={stagger(1)} className="drawer-item px-gutter pt-5 pb-3">
          <button
            type="button"
            onClick={(e) => {
              e.currentTarget.blur();
              openPalette();
            }}
            className="flex h-12 w-full items-center gap-3 rounded-md border border-line bg-surface-inset/60 px-4 text-left text-body-sm text-fg-faint transition-colors hover:border-line-strong hover:text-fg-muted [&_svg]:size-4"
          >
            <Icon name="search" />
            <span>{T.palette.open}</span>
          </button>
        </div>

        {/* Full-bleed rows split by hairlines; the active page gets the bar's brand rule, turned vertical. */}
        <ul className="flex flex-col border-t border-line">
          {data.pages.map((p, i) => {
            const active = current === p.key;
            return (
              <li key={p.key} style={stagger(2 + i)} className="drawer-item border-b border-line">
                <Link
                  href={p.href}
                  aria-current={active ? 'page' : undefined}
                  onClick={closeMenu}
                  className={cn(
                    'relative flex items-center gap-4 px-gutter py-4 transition-colors',
                    'before:absolute before:inset-y-3 before:left-0 before:w-0.5 before:rounded-full before:bg-brand before:transition-opacity',
                    active ? 'text-fg before:opacity-100' : 'text-fg-muted before:opacity-0 hover:bg-fg/[0.04] hover:text-fg',
                  )}
                >
                  <span className="w-5 font-mono text-micro text-accent-fg">{String(i + 1).padStart(2, '0')}</span>
                  <span className="font-display text-h3 font-medium">{p.label}</span>
                  <Icon name="arrowRight" className={cn('ml-auto size-4 transition-opacity', active ? 'text-brand-fg opacity-100' : 'opacity-0')} />
                </Link>
              </li>
            );
          })}
        </ul>

        <div
          style={stagger(2 + data.pages.length)}
          className="drawer-item mt-auto flex items-center justify-between gap-3 border-t border-line px-gutter pt-4 pb-[calc(1rem+env(safe-area-inset-bottom,0px))]"
        >
          <ThemeSwitch t={T.toggles} />
          <LocaleSwitch locale={data.locale} t={T.toggles} />
        </div>
      </div>

      <CommandPalette data={data} open={paletteOpen} onOpen={openPalette} onClose={closePalette} />
    </>
  );
}
