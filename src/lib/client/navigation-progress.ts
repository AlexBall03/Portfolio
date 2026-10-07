/**
 * Client-side navigation progress. Next has no router events, so a navigation
 * "starts" on an internal link click or a programmatic push and "finishes"
 * when the pathname changes (see NavigationProgress). The bar only appears if
 * the navigation is still pending after SHOW_DELAY_MS, so prefetched, instant
 * transitions never flash it.
 */

export type ProgressPhase = 'idle' | 'running' | 'finishing';
export interface ProgressState {
  phase: ProgressPhase;
  /** 0–1 */
  value: number;
}

const SHOW_DELAY_MS = 120;
const TRICKLE_MS = 280;
const FINISH_MS = 420;
const FAILSAFE_MS = 12_000;
/** The trickle approaches but never reaches this; only a finish completes the bar. */
const CEILING = 0.92;

/** One trickle step: fast at first, slowing as it nears the ceiling. */
export function nextTrickle(value: number): number {
  return value + (CEILING - value) * 0.14;
}

interface ClickLike {
  button: number;
  metaKey: boolean;
  ctrlKey: boolean;
  shiftKey: boolean;
  altKey: boolean;
}
interface AnchorLike {
  href: string;
  target: string;
  download: boolean;
}

/** Whether a click on this anchor starts a client-side navigation to another page. */
export function isTrackableClick(e: ClickLike, a: AnchorLike, current: { origin: string; pathname: string }): boolean {
  if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return false;
  if (a.download || (a.target && a.target !== '_self')) return false;
  let url: URL;
  try {
    url = new URL(a.href, current.origin);
  } catch {
    return false;
  }
  if (url.origin !== current.origin) return false;
  // Same page (hash jumps, query-only changes) never changes the pathname, so it would never finish.
  return url.pathname !== current.pathname;
}

const IDLE: ProgressState = { phase: 'idle', value: 0 };
let state = IDLE;
let pending = false;
const listeners = new Set<() => void>();
const timers: { show?: number; trickle?: number; failsafe?: number; hide?: number } = {};

function set(next: ProgressState) {
  state = next;
  listeners.forEach((l) => l());
}

function clearTimers() {
  window.clearTimeout(timers.show);
  window.clearInterval(timers.trickle);
  window.clearTimeout(timers.failsafe);
  window.clearTimeout(timers.hide);
}

export function subscribeProgress(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
export const getProgress = () => state;
export const getServerProgress = () => IDLE;

/** Call before a programmatic navigation; pass the target to skip same-page pushes. */
export function startNavigationProgress(href?: string) {
  if (href && new URL(href, location.href).pathname === location.pathname) return;
  if (pending) return;
  pending = true;
  clearTimers();
  if (state.phase !== 'idle') set(IDLE);
  timers.show = window.setTimeout(() => {
    set({ phase: 'running', value: 0.1 });
    timers.trickle = window.setInterval(() => set({ phase: 'running', value: nextTrickle(state.value) }), TRICKLE_MS);
  }, SHOW_DELAY_MS);
  timers.failsafe = window.setTimeout(finishNavigationProgress, FAILSAFE_MS);
}

export function finishNavigationProgress() {
  if (!pending) return;
  pending = false;
  clearTimers();
  if (state.phase === 'idle') return; // finished before it was ever shown
  set({ phase: 'finishing', value: 1 });
  timers.hide = window.setTimeout(() => set(IDLE), FINISH_MS);
}
