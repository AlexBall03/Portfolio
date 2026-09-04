// Body scroll lock shared by every overlay on the site (the mobile drawer and
// the command palette). Both can be open across the same frame — the drawer
// hands off to the palette when its search row is tapped — so a plain
// `body.style.overflow = ''` from whichever closes first would unlock the page
// underneath the one still open. Counting locks instead makes the order
// irrelevant.
//
// `overflow: hidden` alone is not enough: iOS Safari ignores it for touch
// scrolling and the page keeps moving behind the overlay. Pinning the body with
// `position: fixed` at a negative top offset is what actually holds it, and the
// offset is what lets us put the visitor back where they were on unlock.
let locks = 0;
let prev = null;

export function lockScroll() {
  if (locks++ > 0) return;
  const body = document.body;
  const scrollY = window.scrollY;
  // The scrollbar goes with the body, and the page would jump by its width.
  // Reserve the space it used to take. Zero on touch devices.
  const gap = window.innerWidth - document.documentElement.clientWidth;

  prev = {
    scrollY,
    overflow: body.style.overflow,
    position: body.style.position,
    top: body.style.top,
    left: body.style.left,
    right: body.style.right,
    width: body.style.width,
    paddingRight: body.style.paddingRight,
  };

  body.style.position = 'fixed';
  body.style.top = `-${scrollY}px`;
  body.style.left = '0';
  body.style.right = '0';
  body.style.width = '100%';
  body.style.overflow = 'hidden';
  if (gap > 0) body.style.paddingRight = `${gap}px`;
}

export function unlockScroll() {
  if (locks === 0) return;
  if (--locks > 0) return;

  const body = document.body;
  const { scrollY } = prev;
  body.style.overflow = prev.overflow;
  body.style.position = prev.position;
  body.style.top = prev.top;
  body.style.left = prev.left;
  body.style.right = prev.right;
  body.style.width = prev.width;
  body.style.paddingRight = prev.paddingRight;
  prev = null;

  // `html { scroll-behavior: smooth }` is set globally, and it applies to
  // scrollTo — without this the page would visibly animate back to where it
  // already was. An inline style outranks the stylesheet for the one call.
  const root = document.documentElement;
  const behavior = root.style.scrollBehavior;
  root.style.scrollBehavior = 'auto';
  window.scrollTo(0, scrollY);
  root.style.scrollBehavior = behavior;
}
