import { describe, expect, it } from 'vitest';
import { type GuardWindow, guardHistory, historySettled } from './history-guard';

/** A minimal browser history: a stack of entries and a cursor; back() pops synchronously. */
function fakeWindow() {
  const entries: { url: string; state: unknown }[] = [
    { url: '/admin', state: { __NA: true, tree: 'a' } },
    { url: '/admin/projects/1', state: { __NA: true, tree: 'b' } },
  ];
  let index = 1;
  const listeners = new Set<() => void>();
  const win: GuardWindow = {
    history: {
      get state() {
        return entries[index]!.state;
      },
      pushState(state: unknown, _unused: string, url?: string | URL | null) {
        entries.splice(index + 1);
        entries.push({ url: String(url ?? entries[index]!.url), state });
        index++;
      },
      back() {
        if (index === 0) return;
        index--;
        for (const l of [...listeners]) l();
      },
    },
    location: {
      get href() {
        return entries[index]!.url;
      },
    },
    addEventListener: (_type, l) => listeners.add(l),
    removeEventListener: (_type, l) => listeners.delete(l),
  };
  return { win, entries, url: () => entries[index]!.url, listeners };
}

describe('guardHistory', () => {
  it('adds a same-URL sentinel that keeps the router state', () => {
    const { win, entries } = fakeWindow();
    guardHistory(win, () => true);
    expect(entries).toHaveLength(3);
    expect(entries[2]).toEqual({ url: '/admin/projects/1', state: { __NA: true, tree: 'b', __unsavedChangesGuard: true } });
  });

  it('stays on the page when the user cancels Back, and keeps guarding', () => {
    const { win, url, entries } = fakeWindow();
    let asked = 0;
    guardHistory(win, () => {
      asked++;
      return false;
    });
    win.history.back();
    expect(asked).toBe(1);
    expect(url()).toBe('/admin/projects/1');
    expect(entries).toHaveLength(3); // sentinel restored

    win.history.back();
    expect(asked).toBe(2);
    expect(url()).toBe('/admin/projects/1');
  });

  it('continues to the previous page when the user confirms', () => {
    const { win, url, listeners } = fakeWindow();
    guardHistory(win, () => true);
    win.history.back();
    expect(url()).toBe('/admin');
    expect(listeners.size).toBe(0);
  });

  it('consumes the sentinel silently once released (saved or discarded)', async () => {
    const { win, url, listeners } = fakeWindow();
    let asked = 0;
    const release = guardHistory(win, () => {
      asked++;
      return true;
    });
    release();
    await historySettled();
    expect(asked).toBe(0);
    expect(url()).toBe('/admin/projects/1');
    expect(win.history.state).toEqual({ __NA: true, tree: 'b' });
    expect(listeners.size).toBe(0);
  });

  it('leaves history alone on release after navigating elsewhere', () => {
    const { win, url } = fakeWindow();
    const release = guardHistory(win, () => true);
    win.history.pushState({ __NA: true, tree: 'c' }, '', '/admin/projects');
    release();
    expect(url()).toBe('/admin/projects');
  });
});
