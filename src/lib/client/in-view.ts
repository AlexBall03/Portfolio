'use client';

import { useEffect, useRef, useState } from 'react';

/**
 * One shared IntersectionObserver for every scroll-reveal element on the page.
 * Each element reports into React state (never mutating the DOM directly), so
 * there is nothing for hydration to disagree with.
 */
const callbacks = new WeakMap<Element, () => void>();
let observer: IntersectionObserver | null = null;

function getObserver() {
  if (!observer) {
    // Enables the hidden-until-revealed styles only once JavaScript is running.
    document.documentElement.setAttribute('data-anim-ready', '');
    observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          callbacks.get(entry.target)?.();
          callbacks.delete(entry.target);
          observer?.unobserve(entry.target);
        }
      },
      { rootMargin: '0px 0px -8% 0px', threshold: 0.01 },
    );
  }
  return observer;
}

/** Returns a ref and whether that element has scrolled into view (once). */
export function useInView<T extends Element>() {
  const ref = useRef<T>(null);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = getObserver();
    callbacks.set(el, () => setInView(true));
    io.observe(el);
    return () => {
      callbacks.delete(el);
      io.unobserve(el);
    };
  }, []);

  return [ref, inView] as const;
}
