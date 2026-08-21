// Module-level singleton: drives all scroll-based reveal and count-up animations.
// Uses getBoundingClientRect (not IntersectionObserver) for reliability in
// non-scrolling embeds and auto-height iframes.
const watchers = new Set();
let raf = 0, bound = false, scrollSeen = false, fallbackTimer = 0;

function fireAll() {
  watchers.forEach((w) => { try { w.cb(); } catch (e) {} });
  watchers.clear();
}

function check() {
  const vh = window.innerHeight || document.documentElement.clientHeight;
  watchers.forEach((w) => {
    const el = w.el;
    if (!el || !el.isConnected) { watchers.delete(w); return; }
    const r = el.getBoundingClientRect();
    if (r.top < vh * w.at && r.bottom > vh * 0.02) {
      w.cb();
      if (w.once) watchers.delete(w);
    }
  });
}

function schedule() {
  if (!scrollSeen) {
    scrollSeen = true;
    if (fallbackTimer) { clearTimeout(fallbackTimer); fallbackTimer = 0; }
  }
  if (raf) return;
  raf = requestAnimationFrame(() => { raf = 0; check(); });
}

function ensureBound() {
  if (bound) return;
  bound = true;
  ['scroll', 'resize', 'orientationchange', 'wheel', 'touchmove'].forEach((ev) =>
    window.addEventListener(ev, schedule, { passive: true }));
  window.addEventListener('load', check);
  if (document.fonts?.ready) document.fonts.ready.then(check);
  // Safety net: if no scrolling happens within 4 s, reveal everything
  // (handles non-scrolling embeds where content would otherwise stay hidden).
  fallbackTimer = setTimeout(() => { if (!scrollSeen) fireAll(); }, 4000);
}

export function watchVisible(el, cb, { at = 0.9, once = true } = {}) {
  const w = { el, cb, at, once };
  watchers.add(w);
  ensureBound();
  requestAnimationFrame(check);
  [40, 160, 400, 900].forEach((t) => setTimeout(check, t));
  return () => watchers.delete(w);
}
