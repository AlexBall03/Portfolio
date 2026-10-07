import { describe, expect, it } from 'vitest';
import { formatExperienceRange } from '@/features/experience/format';
import { en } from './dictionaries/en';
import { fill, localizedPath, splitLocale } from './paths';
import { pickTranslation } from './translations';

describe('locale paths', () => {
  it('keeps the default locale unprefixed and prefixes others', () => {
    expect(localizedPath('en', '/')).toBe('/');
    expect(localizedPath('en', '/about')).toBe('/about');
    expect(localizedPath('es', '/')).toBe('/es');
    expect(localizedPath('es', 'projects/weather/')).toBe('/es/projects/weather');
  });

  it('splits a public path into locale and remainder', () => {
    expect(splitLocale('/es/about')).toEqual({ locale: 'es', path: '/about', prefixed: true });
    expect(splitLocale('/es')).toEqual({ locale: 'es', path: '/', prefixed: true });
    expect(splitLocale('/en/contact')).toEqual({ locale: 'en', path: '/contact', prefixed: true });
    expect(splitLocale('/about/')).toEqual({ locale: 'en', path: '/about', prefixed: false });
    // A segment that merely starts like a locale is not one.
    expect(splitLocale('/espresso')).toEqual({ locale: 'en', path: '/espresso', prefixed: false });
  });

  it('fills placeholders and leaves unknown ones intact', () => {
    expect(fill('Pushed to {ref}', { ref: 'main' })).toBe('Pushed to main');
    expect(fill('{a} {b}', { a: 1 })).toBe('1 {b}');
  });
});

describe('translation fallback', () => {
  const rows = [
    { locale: 'en' as const, v: 'hello' },
    { locale: 'es' as const, v: 'hola' },
  ];
  it('prefers the requested locale, then the default', () => {
    expect(pickTranslation(rows, 'es')?.v).toBe('hola');
    expect(pickTranslation(rows.slice(0, 1), 'es')?.v).toBe('hello');
    expect(pickTranslation([], 'es')).toBeUndefined();
  });
});

describe('experience date ranges', () => {
  const labels = en.experience;
  it('formats month and year precision in each locale without shifting days', () => {
    expect(
      formatExperienceRange({ startDate: '2026-03-01', endDate: null, datePrecision: 'month', isCurrent: true }, 'en', labels),
    ).toBe('Mar 2026 — Present');
    expect(
      formatExperienceRange({ startDate: '2017-01-01', endDate: '2021-01-01', datePrecision: 'year', isCurrent: false }, 'es', labels),
    ).toBe('2017 — 2021');
  });

  it('marks a planned end date on a current entry as expected', () => {
    expect(
      formatExperienceRange({ startDate: '2024-02-01', endDate: '2028-02-01', datePrecision: 'month', isCurrent: true }, 'en', labels),
    ).toBe('Feb 2024 — Feb 2028 (Expected)');
  });
});
