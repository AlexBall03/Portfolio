/**
 * Asks before browser back/forward leaves a page with unsaved changes.
 *
 * Browsers don't let a page cancel a history traversal, so the guard adds a
 * same-URL "sentinel" entry on top of the current one. Back then lands on the
 * page's own original entry (nothing visible happens) and fires `popstate`,
 * where the guard asks: stay → the sentinel is pushed again; leave → it steps
 * back once more, to where the user was going.
 *
 * The sentinel copies the current `history.state`, so Next's router keeps
 * treating both entries as its own (its state carries the route tree).
 * Pushing it drops any forward history, so forward navigation from a dirty
 * editor isn't possible rather than unguarded.
 */

const MARKER = '__unsavedChangesGuard';

export interface GuardWindow {
  history: Pick<History, 'state' | 'pushState' | 'back'>;
  location: Pick<Location, 'href'>;
  addEventListener: (type: 'popstate', listener: () => void) => void;
  removeEventListener: (type: 'popstate', listener: () => void) => void;
}

/** Set while a release is stepping back off the sentinel (history traversal is async). */
let settling: Promise<void> | null = null;

/**
 * Resolves once history is stable. Navigate programmatically right after a
 * save only after this (`await historySettled(); router.replace(…)`), or the
 * pending step back would land on top of the new route.
 */
export const historySettled = (): Promise<void> => settling ?? Promise.resolve();

const isSentinel = (state: unknown) =>
  typeof state === 'object' && state !== null && (state as Record<string, unknown>)[MARKER] === true;

/**
 * Starts guarding; returns `release`, called once the changes are saved or
 * discarded (or the editor unmounts). Releasing on the sentinel consumes it,
 * so the next Back doesn't appear to do nothing.
 */
export function guardHistory(win: GuardWindow, confirmLeave: () => boolean): () => void {
  const pushSentinel = () => {
    const state = (win.history.state ?? {}) as Record<string, unknown>;
    win.history.pushState({ ...state, [MARKER]: true }, '', win.location.href);
  };
  let active = true;

  const onPopState = () => {
    // Forward onto our own entry (e.g. after a cancelled leave): nothing to ask.
    if (isSentinel(win.history.state)) return;
    if (confirmLeave()) {
      stop();
      win.history.back();
    } else {
      pushSentinel();
    }
  };

  const stop = () => {
    active = false;
    win.removeEventListener('popstate', onPopState);
  };

  if (!isSentinel(win.history.state)) pushSentinel();
  win.addEventListener('popstate', onPopState);

  return () => {
    if (!active) return;
    stop();
    if (!isSentinel(win.history.state)) return;
    settling = new Promise((resolve) => {
      const settled = () => {
        win.removeEventListener('popstate', settled);
        settling = null;
        resolve();
      };
      win.addEventListener('popstate', settled);
      win.history.back();
    });
  };
}
