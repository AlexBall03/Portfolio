'use client';

import { useEffect } from 'react';

/**
 * Lets the background's two ambient glows drift very slightly with the
 * pointer. Renders nothing: it writes `--pointer-x` / `--pointer-y` (-1…1,
 * from the viewport centre) on <html>, at most once per frame, and the CSS
 * (`.atmosphere-glow` in system.css) eases the glows toward them. Mouse and
 * trackpad only, and off under reduced motion; the glows recentre when the
 * pointer leaves the window.
 */
export function PointerGlow() {
  useEffect(() => {
    const fine = window.matchMedia('(hover: hover) and (pointer: fine)');
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
    if (!fine.matches || reduced.matches) return;

    const root = document.documentElement;
    let raf = 0;
    let x = 0;
    let y = 0;
    const write = () => {
      raf = 0;
      root.style.setProperty('--pointer-x', x.toFixed(3));
      root.style.setProperty('--pointer-y', y.toFixed(3));
    };
    const schedule = () => {
      if (!raf) raf = requestAnimationFrame(write);
    };
    const move = (e: PointerEvent) => {
      if (e.pointerType !== 'mouse') return;
      x = (e.clientX / window.innerWidth) * 2 - 1;
      y = (e.clientY / window.innerHeight) * 2 - 1;
      schedule();
    };
    const leave = () => {
      x = 0;
      y = 0;
      schedule();
    };

    window.addEventListener('pointermove', move, { passive: true });
    document.documentElement.addEventListener('pointerleave', leave);
    return () => {
      window.removeEventListener('pointermove', move);
      document.documentElement.removeEventListener('pointerleave', leave);
      cancelAnimationFrame(raf);
      root.style.removeProperty('--pointer-x');
      root.style.removeProperty('--pointer-y');
    };
  }, []);

  return null;
}
