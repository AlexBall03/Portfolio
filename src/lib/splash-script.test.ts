import { describe, expect, it } from 'vitest';
import { SPLASH_STORAGE_KEY, splashInitScript } from './splash-script';

/**
 * Runs the real inline boot script against a simulated page: a controllable
 * clock, animation frames, timers, and load milestones.
 */
function boot({ seen = false } = {}) {
  let now = 0;
  const attrs = new Map<string, string>();
  /** When each attribute was first set (simulated ms). */
  const setAt = new Map<string, number>();
  const boots: number[] = [];
  const listeners = new Map<string, Set<(e: unknown) => void>>();
  const docListeners = new Map<string, () => void>();
  let frames: ((t: number) => void)[] = [];
  const timers: { at: number; run: () => void }[] = [];
  let fontsReady!: () => void;
  const store = new Map<string, string>(seen ? [[SPLASH_STORAGE_KEY, '1']] : []);

  const documentElement = {
    setAttribute: (k: string, v: string) => {
      if (!setAt.has(k)) setAt.set(k, now);
      attrs.set(k, v);
    },
    hasAttribute: (k: string) => attrs.has(k),
    style: { setProperty: (_: string, v: string) => boots.push(Number(v)) },
  };
  const env = {
    document: {
      documentElement,
      addEventListener: (t: string, fn: () => void) => docListeners.set(t, fn),
      fonts: { ready: new Promise<void>((r) => (fontsReady = r)) },
    },
    sessionStorage: { getItem: (k: string) => store.get(k) ?? null, setItem: (k: string, v: string) => store.set(k, v) },
    performance: { now: () => now },
    requestAnimationFrame: (fn: (t: number) => void) => frames.push(fn),
    setTimeout: (run: () => void, ms: number) => timers.push({ at: now + ms, run }),
    addEventListener: (t: string, fn: (e: unknown) => void) => {
      if (!listeners.has(t)) listeners.set(t, new Set());
      listeners.get(t)!.add(fn);
    },
    removeEventListener: (t: string, fn: (e: unknown) => void) => listeners.get(t)?.delete(fn),
  };
  // Evaluates the exact string the page inlines.
  new Function(...Object.keys(env), splashInitScript())(...Object.values(env));

  /** Advances the clock in 16ms frames, firing due timers. */
  const advance = (ms: number) => {
    const end = now + ms;
    while (now < end) {
      now += 16;
      for (const t of timers.filter((t) => t.at <= now)) {
        timers.splice(timers.indexOf(t), 1);
        t.run();
      }
      const due = frames;
      frames = [];
      due.forEach((fn) => fn(now));
    }
  };
  const flush = () => new Promise((r) => setTimeout(r, 0));
  const scrollBlocked = () => (listeners.get('wheel')?.size ?? 0) > 0;
  return {
    attrs,
    setAt,
    boots,
    advance,
    scrollBlocked,
    parsed: () => docListeners.get('DOMContentLoaded')!(),
    fonts: async () => (fontsReady(), await flush()),
    loaded: () => [...(listeners.get('load') ?? [])].forEach((fn) => fn({})),
    last: () => boots.at(-1) ?? 0,
  };
}

describe('splash boot script', () => {
  it('shows the screen once per session', () => {
    expect(boot().attrs.get('data-splash')).toBe('on');
    expect(boot({ seen: true }).attrs.get('data-splash')).toBe('off');
  });

  it('never shows more than has really loaded, and never goes backwards', async () => {
    const b = boot();
    b.advance(3000);
    expect(b.last()).toBeLessThan(45); // nothing parsed yet: it creeps, but stays under the next milestone
    b.parsed();
    b.advance(3000);
    expect(b.last()).toBeLessThan(72);
    expect(b.attrs.has('data-booted')).toBe(false);
    await b.fonts();
    b.loaded();
    b.advance(400);
    expect(b.last()).toBe(100);
    expect(b.boots).toEqual([...b.boots].sort((x, y) => x - y));
  });

  it('shows the whole climb on a fast load: intro at 0, paced count, brass flash, then boot', async () => {
    const b = boot();
    b.parsed();
    await b.fonts();
    b.loaded();
    expect(b.scrollBlocked()).toBe(true);
    b.advance(240);
    expect(b.last()).toBe(0); // waits for the mark, bar, and label to arrive
    b.advance(400);
    expect(b.last()).toBeGreaterThan(20); // following the pace, not jumping to 100
    expect(b.last()).toBeLessThan(100);
    expect(b.attrs.has('data-boot-done')).toBe(false);
    b.advance(800);
    expect(b.last()).toBe(100);
    // 100% starts the flash; the screen dissolves at its peak, not after a wait.
    expect(b.attrs.has('data-boot-done')).toBe(true);
    expect(b.attrs.has('data-booted')).toBe(false);
    b.advance(400);
    expect(b.attrs.has('data-booted')).toBe(true);
    const hold = b.setAt.get('data-booted')! - b.setAt.get('data-boot-done')!;
    expect(hold).toBeGreaterThanOrEqual(340);
    expect(hold).toBeLessThan(400);
    // The climb itself is visible for about a second (the eased count reads 100 a little before the curve ends).
    expect(b.setAt.get('data-boot-done')!).toBeGreaterThan(1000);
    expect(b.scrollBlocked()).toBe(false);
  });

  it('skips the pace (and never blocks scrolling) on loads without the screen', async () => {
    const b = boot({ seen: true });
    expect(b.scrollBlocked()).toBe(false);
    b.parsed();
    await b.fonts();
    b.loaded();
    b.advance(200);
    expect(b.attrs.has('data-booted')).toBe(true);
    expect(b.attrs.has('data-boot-done')).toBe(false); // the flash belongs to the screen
  });

  it('finishes on its own when a resource never loads', () => {
    const b = boot();
    b.parsed();
    b.advance(8800); // failsafe at 8s, plus the completion hold
    expect(b.last()).toBe(100);
    expect(b.attrs.has('data-booted')).toBe(true);
    expect(b.scrollBlocked()).toBe(false);
  });
});
