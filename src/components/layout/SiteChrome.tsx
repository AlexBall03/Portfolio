'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState, useSyncExternalStore } from 'react';
import { Icon } from '@/components/ui/Icon';
import { NAV_CTA, pageForPath } from '@/config/navigation';
import { useLocalelessPath } from '@/lib/client/locale';
import { lockScroll, unlockScroll } from '@/lib/client/scroll-lock';
import { BrandMark } from './BrandMark';
import { CommandPalette } from './CommandPalette';
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

/** Top navigation, mobile drawer, and command palette (they share open/close state). */
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
  const cta = data.pages.find((p) => p.key === NAV_CTA);
  const links = data.pages.filter((p) => p.key !== NAV_CTA);

  return (
    <>
      <nav className={`nav ${scrolled ? 'scrolled' : ''}`} aria-label={T.nav.primary}>
        <div className="nav-inner">
          <Link href={home?.href ?? '/'} className="nav-logo" onClick={closeMenu}>
            <BrandMark text={data.brandMark} />
          </Link>
          <div className="nav-links">
            {links.map((p) => (
              <Link
                key={p.key}
                href={p.href}
                className={current === p.key ? 'active' : ''}
                aria-current={current === p.key ? 'page' : undefined}
              >
                {p.label}
              </Link>
            ))}
            <button
              type="button"
              className="nav-cmdk"
              onClick={openPalette}
              aria-label={T.palette.open}
              aria-keyshortcuts="Meta+K Control+K"
            >
              <Icon name="search" />
              <kbd className="mono" aria-hidden="true">
                {shortcut}
              </kbd>
            </button>
          </div>
          {cta && (
            <Link
              href={cta.href}
              className={`btn btn-outline nav-cta ${current === cta.key ? 'is-active' : ''}`}
              aria-current={current === cta.key ? 'page' : undefined}
            >
              {cta.label}
            </Link>
          )}
        </div>
      </nav>

      {!menuOpen && (
        <button
          type="button"
          className="nav-burger"
          aria-label={T.nav.openMenu}
          aria-expanded={false}
          aria-controls="mobile-drawer"
          onClick={() => setMenuOpen(true)}
        >
          <Icon name="menu" />
        </button>
      )}

      <div className={`mobile-scrim ${menuOpen ? 'open' : ''}`} onClick={closeMenu} aria-hidden="true" />
      <div
        id="mobile-drawer"
        className={`mobile-drawer ${menuOpen ? 'open' : ''}`}
        role="dialog"
        aria-modal="true"
        aria-label={T.nav.menu}
        inert={!menuOpen}
      >
        <div className="mobile-drawer-head">
          <span className="nav-logo" style={{ padding: 0, margin: 0, border: 0 }}>
            <BrandMark text={data.brandMark} />
          </span>
          <button type="button" className="drawer-close" aria-label={T.nav.closeMenu} onClick={closeMenu}>
            <Icon name="x" />
          </button>
        </div>
        <div className="mobile-drawer-links">
          <button
            type="button"
            className="d-search"
            onClick={(e) => {
              e.currentTarget.blur();
              openPalette();
            }}
          >
            <Icon name="search" />
            <span>{T.palette.open}</span>
          </button>
          {data.pages.map((p, i) => (
            <Link
              key={p.key}
              href={p.href}
              className={`d-link ${current === p.key ? 'active' : ''}`}
              aria-current={current === p.key ? 'page' : undefined}
              onClick={closeMenu}
            >
              <span className="d-ic">
                <Icon name={p.icon} />
              </span>
              <span className="d-label">{p.label}</span>
              <span className="d-n">{String(i + 1).padStart(2, '0')}</span>
            </Link>
          ))}
        </div>
      </div>

      <CommandPalette data={data} open={paletteOpen} onOpen={openPalette} onClose={closePalette} />
    </>
  );
}
