import { describe, expect, it } from 'vitest';
import { formatExperienceRange } from '@/features/experience/format';
import { fill } from './copy';

describe('fill', () => {
  it('fills placeholders and leaves unknown ones intact', () => {
    expect(fill('Pushed to {ref}', { ref: 'main' })).toBe('Pushed to main');
    expect(fill('{a} {b}', { a: 1 })).toBe('1 {b}');
  });
});

describe('experience date ranges', () => {
  it('formats month and year precision without shifting days', () => {
    expect(formatExperienceRange({ startDate: '2026-03-01', endDate: null, datePrecision: 'month', isCurrent: true })).toBe(
      'Mar 2026 — Present',
    );
    expect(
      formatExperienceRange({ startDate: '2017-01-01', endDate: '2021-01-01', datePrecision: 'year', isCurrent: false }),
    ).toBe('2017 — 2021');
  });

  it('marks a planned end date on a current entry as expected', () => {
    expect(
      formatExperienceRange({ startDate: '2024-02-01', endDate: '2028-02-01', datePrecision: 'month', isCurrent: true }),
    ).toBe('Feb 2024 — Feb 2028 (Expected)');
  });
});
