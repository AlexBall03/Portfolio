'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { type CSSProperties, useCallback, useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { Container } from '@/components/ui/Container';
import { Icon } from '@/components/ui/Icon';
import { ScrollFade } from '@/components/ui/ScrollFade';
import { copy } from '@/config/copy';
import { pageForPath } from '@/config/navigation';
import { cn } from '@/lib/cn';
import { lockScroll, unlockScroll } from '@/lib/client/scroll-lock';
import { BrandMark } from './BrandMark';
import { CommandPalette } from './CommandPalette';
import { controlStyles, ThemeSwitch, ThemeToggle } from './Preferences';
import { PLATFORM_ICONS, type ChromeData } from './types';

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
  'inline-flex size-11 items-center justify-center rounded-md text-fg-muted transition-colors hover:bg-fg/[0.06] hover:text-fg [&_svg]:size-5';

/** The drawer's quick actions (resume, email). */
const drawerAction =
  'inline-flex h-11 min-w-0 items-center justify-center gap-2 rounded-md border border-line bg-surface-inset/60 px-3 text-body-sm font-medium text-fg-muted transition-colors hover:border-line-strong hover:text-fg [&_svg]:size-4 [&_svg]:shrink-0 [&_svg]:text-brand-fg';

/** Command bar, mobile drawer, and command palette (they share open/close state). */
export function SiteChrome({ data }: { data: ChromeData }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const scrolled = useScrolled();
  const shortcut = useShortcutLabel();
  const current = pageForPath(usePathname());
  const T = copy;

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
                <ThemeToggle />
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
        className="drawer fixed inset-y-0 right-0 z-[61] flex w-full flex-col overflow-hidden sm:w-[26rem] lg:hidden"
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
        <div style={stagger(1)} className="drawer-item shrink-0 px-gutter pt-5 pb-3">
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

        {/* Only the page list scrolls; the header, search, and footer stay put. Icon-led rows with
            each page's one-line description; the active page is a brand-tinted card. */}
        <ScrollFade className="flex-1">
          <ul className="flex flex-col gap-1 px-gutter pb-4">
            {data.pages.map((p, i) => {
              const active = current === p.key;
              return (
                <li key={p.key} style={stagger(2 + i)} className="drawer-item -mx-2.5">
                  <Link
                    href={p.href}
                    aria-current={active ? 'page' : undefined}
                    onClick={closeMenu}
                    className={cn(
                      'relative flex items-center gap-3.5 rounded-lg px-2.5 py-2.5 transition-colors',
                      'before:absolute before:inset-y-3 before:left-0 before:w-0.5 before:rounded-full before:bg-brand before:transition-opacity',
                      active ? 'bg-brand-soft/60 before:opacity-100' : 'before:opacity-0 hover:bg-fg/[0.04]',
                    )}
                  >
                    <span
                      aria-hidden="true"
                      className={cn(
                        'inline-flex size-10 shrink-0 items-center justify-center rounded-md border transition-colors [&_svg]:size-[18px]',
                        active ? 'border-accent/35 bg-brand-soft text-accent-fg' : 'border-line bg-surface-inset/60 text-fg-muted',
                      )}
                    >
                      <Icon name={p.icon} />
                    </span>
                    <span className="flex min-w-0 flex-col">
                      <span className={cn('font-display text-body-lg font-medium', active ? 'text-fg' : 'text-fg-muted')}>{p.label}</span>
                      {p.description && <span className="truncate text-body-sm text-fg-faint">{p.description}</span>}
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </ScrollFade>

        <div
          style={stagger(2 + data.pages.length)}
          className="drawer-item flex shrink-0 flex-col gap-4 border-t border-line px-gutter pt-5 pb-[calc(1rem+env(safe-area-inset-bottom,0px))]"
        >
          <div className="grid grid-cols-2 gap-2">
            {data.resume && (
              <a href={data.resume.href} download={data.resume.fileName} className={drawerAction}>
                <Icon name="download" />
                <span className="truncate">{T.footer.resume}</span>
              </a>
            )}
            <a href={`mailto:${data.email}`} className={cn(drawerAction, !data.resume && 'col-span-2')}>
              <Icon name="mail" />
              <span className="truncate">{T.footer.email}</span>
            </a>
          </div>
          <div className="flex items-center justify-between gap-3">
            <ThemeSwitch />
            {data.socials.length > 0 && (
              <ul aria-label={T.footer.connect} className="-mr-2 flex items-center">
                {data.socials.map((s) => (
                  <li key={s.platform}>
                    <a href={s.url} target="_blank" rel="noopener noreferrer" aria-label={s.label} title={s.label} className={iconButton}>
                      <Icon name={PLATFORM_ICONS[s.platform]} />
                    </a>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>

      <CommandPalette data={data} open={paletteOpen} onOpen={openPalette} onClose={closePalette} />
    </>
  );
}
