'use client';

import Link from 'next/link';
import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { Container } from '@/components/ui/Container';
import { Icon } from '@/components/ui/Icon';
import { pageForPath } from '@/config/navigation';
import { cn } from '@/lib/cn';
import { useLocalelessPath } from '@/lib/client/locale';
import { lockScroll, unlockScroll } from '@/lib/client/scroll-lock';
import { BrandMark } from './BrandMark';
import { CommandPalette } from './CommandPalette';
import { controlStyles, LocaleSwitch, ThemeToggle } from './Preferences';
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
      <header className="pointer-events-none fixed inset-x-0 top-3 z-50 sm:top-4">
        <Container>
          <nav
            aria-label={T.nav.primary}
            className={cn(
              'pointer-events-auto flex h-14 items-center gap-1 rounded-lg px-2 transition-[background-color,box-shadow] duration-300',
              scrolled ? 'glass-strong' : 'glass',
            )}
          >
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
              <button
                type="button"
                onClick={openPalette}
                aria-label={T.palette.open}
                aria-keyshortcuts="Meta+K Control+K"
                className={cn(controlStyles, 'hidden min-w-9 justify-center gap-2 px-2.5 hover:bg-fg/[0.06] lg:inline-flex [&_svg]:size-4')}
              >
                <Icon name="search" />
                <kbd aria-hidden="true" className="hidden font-mono text-micro uppercase xl:inline">
                  {shortcut}
                </kbd>
              </button>
              {/* Wrapped, so `hidden` never competes with the controls' own display classes. */}
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
          'fixed inset-0 z-[60] bg-scrim transition-opacity duration-300 lg:hidden',
          menuOpen ? 'opacity-100' : 'pointer-events-none opacity-0',
        )}
      />
      <div
        id="mobile-drawer"
        role="dialog"
        aria-modal="true"
        aria-label={T.nav.menu}
        inert={!menuOpen}
        className={cn(
          'glass-strong fixed inset-y-2 right-2 z-[61] flex w-[min(calc(100vw-1rem),24rem)] flex-col overflow-y-auto rounded-xl p-4 transition-[transform,visibility] duration-300 ease-out lg:hidden',
          'pb-[calc(1rem+env(safe-area-inset-bottom,0px))]',
          menuOpen ? 'visible translate-x-0' : 'invisible translate-x-[calc(100%+1rem)]',
        )}
      >
        <div className="flex items-center justify-between border-b border-line pb-3 pl-2">
          <BrandMark text={data.brandMark} className="text-body" />
          <button ref={drawerCloseRef} type="button" aria-label={T.nav.closeMenu} onClick={closeMenu} className={iconButton}>
            <Icon name="x" />
          </button>
        </div>

        <button
          type="button"
          onClick={(e) => {
            e.currentTarget.blur();
            openPalette();
          }}
          className="mt-4 flex h-12 w-full items-center gap-3 rounded-md border border-line bg-surface-inset/60 px-4 text-left text-body-sm text-fg-faint transition-colors hover:border-line-strong hover:text-fg-muted [&_svg]:size-4"
        >
          <Icon name="search" />
          <span>{T.palette.open}</span>
        </button>

        <ul className="mt-3 flex flex-col gap-0.5">
          {data.pages.map((p, i) => {
            const active = current === p.key;
            return (
              <li key={p.key}>
                <Link
                  href={p.href}
                  aria-current={active ? 'page' : undefined}
                  onClick={closeMenu}
                  className={cn(
                    'flex items-center gap-4 rounded-md px-3 py-3 transition-colors',
                    active ? 'bg-brand-soft text-fg' : 'text-fg-muted hover:bg-fg/[0.05] hover:text-fg',
                  )}
                >
                  <span className="w-5 font-mono text-micro text-accent-fg">{String(i + 1).padStart(2, '0')}</span>
                  <span className="font-display text-h3 font-medium">{p.label}</span>
                  {active && <span aria-hidden="true" className="ml-auto size-1.5 rounded-full bg-brand" />}
                </Link>
              </li>
            );
          })}
        </ul>

        <div className="mt-auto flex items-center justify-between gap-3 border-t border-line pt-4">
          <ThemeToggle t={T.toggles} labelled />
          <LocaleSwitch locale={data.locale} t={T.toggles} />
        </div>
      </div>

      <CommandPalette data={data} open={paletteOpen} onOpen={openPalette} onClose={closePalette} />
    </>
  );
}
