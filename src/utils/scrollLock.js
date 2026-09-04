// Body scroll lock shared by every overlay on the site (the mobile drawer and
// the command palette). Both can be open across the same frame — the drawer
// hands off to the palette when its search row is tapped — so a plain
// `body.style.overflow = ''` from whichever closes first would unlock the page
// underneath the one still open. Counting locks instead makes the order
// irrelevant.
let locks = 0;
let prevOverflow = '';
let prevPadding = '';

export function lockScroll() {
  if (locks++ > 0) return;
  const body = document.body;
  // The scrollbar disappears with `overflow: hidden`, and the page would jump
  // by its width. Reserve the space it used to take.
  const gap = window.innerWidth - document.documentElement.clientWidth;
  prevOverflow = body.style.overflow;
  prevPadding = body.style.paddingRight;
  body.style.overflow = 'hidden';
  if (gap > 0) body.style.paddingRight = `${gap}px`;
}

export function unlockScroll() {
  if (locks === 0) return;
  if (--locks > 0) return;
  document.body.style.overflow = prevOverflow;
  document.body.style.paddingRight = prevPadding;
}
