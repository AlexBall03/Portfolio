import { describe, expect, it } from 'vitest';
import { isTrackableClick, nextTrickle } from './navigation-progress';

const here = { origin: 'https://alexball.dev', pathname: '/about' };
const click = { button: 0, metaKey: false, ctrlKey: false, shiftKey: false, altKey: false };
const link = (href: string, extra: Partial<{ target: string; download: boolean }> = {}) => ({
  href,
  target: '',
  download: false,
  ...extra,
});

describe('isTrackableClick', () => {
  it('tracks a plain click to another internal page', () => {
    expect(isTrackableClick(click, link('https://alexball.dev/projects'), here)).toBe(true);
    expect(isTrackableClick(click, link('/es/about'), here)).toBe(true);
  });

  it('ignores clicks that do not navigate this tab to another page', () => {
    expect(isTrackableClick(click, link('https://github.com/alex'), here)).toBe(false);
    expect(isTrackableClick(click, link('/projects', { target: '_blank' }), here)).toBe(false);
    expect(isTrackableClick(click, link('/resume.pdf', { download: true }), here)).toBe(false);
    expect(isTrackableClick(click, link('mailto:contact@alexball.dev'), here)).toBe(false);
    expect(isTrackableClick(click, link('/about#stack'), here)).toBe(false);
    expect(isTrackableClick(click, link('/about'), here)).toBe(false);
  });

  it('ignores modified and non-primary clicks', () => {
    expect(isTrackableClick({ ...click, metaKey: true }, link('/projects'), here)).toBe(false);
    expect(isTrackableClick({ ...click, ctrlKey: true }, link('/projects'), here)).toBe(false);
    expect(isTrackableClick({ ...click, button: 1 }, link('/projects'), here)).toBe(false);
  });
});

describe('nextTrickle', () => {
  it('climbs monotonically but never completes on its own', () => {
    let v = 0.1;
    for (let i = 0; i < 200; i++) {
      const next = nextTrickle(v);
      expect(next).toBeGreaterThanOrEqual(v);
      expect(next).toBeLessThan(0.93);
      v = next;
    }
    expect(v).toBeGreaterThan(0.9);
  });
});
