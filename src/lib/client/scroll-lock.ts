/**
 * Counted body scroll lock shared by every overlay (mobile drawer, command
 * palette). Both can be open in the same frame — the drawer hands off to the
 * palette — so locks are counted and the page unlocks only when the last one
 * closes. `position: fixed` (not just `overflow: hidden`) is what holds the
 * page on iOS Safari; the saved offset restores the scroll position.
 */
type Saved = { scrollY: number } & Pick<
  CSSStyleDeclaration,
  'overflow' | 'position' | 'top' | 'left' | 'right' | 'width' | 'paddingRight'
>;

let locks = 0;
let saved: Saved | null = null;

export function lockScroll() {
  if (locks++ > 0) return;
  const { style } = document.body;
  const scrollY = window.scrollY;
  // Reserve the scrollbar's width so the page doesn't jump (zero on touch devices).
  const gap = window.innerWidth - document.documentElement.clientWidth;
  saved = {
    scrollY,
    overflow: style.overflow,
    position: style.position,
    top: style.top,
    left: style.left,
    right: style.right,
    width: style.width,
    paddingRight: style.paddingRight,
  };
  Object.assign(style, {
    position: 'fixed',
    top: `-${scrollY}px`,
    left: '0',
    right: '0',
    width: '100%',
    overflow: 'hidden',
    ...(gap > 0 ? { paddingRight: `${gap}px` } : {}),
  });
}

export function unlockScroll() {
  if (locks === 0 || --locks > 0 || !saved) return;
  const { scrollY, ...styles } = saved;
  Object.assign(document.body.style, styles);
  saved = null;
  // Jump back instantly even though the site uses smooth scrolling.
  const root = document.documentElement;
  const behavior = root.style.scrollBehavior;
  root.style.scrollBehavior = 'auto';
  window.scrollTo(0, scrollY);
  root.style.scrollBehavior = behavior;
}
