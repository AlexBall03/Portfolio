import { LOCALE_TAGS, type Locale } from '@/i18n/config';
import type { MilestonePrecision } from './case-study';

const PARTS: Record<MilestonePrecision, Intl.DateTimeFormatOptions> = {
  day: { year: 'numeric', month: 'short', day: 'numeric' },
  month: { year: 'numeric', month: 'short' },
  year: { year: 'numeric' },
};

/**
 * A milestone date at its precision ("Mar 4, 2026", "Mar 2026", "2026").
 * Calendar dates are formatted in UTC so they never shift a day, and nothing
 * reads the clock, so this is safe in cached pages.
 */
export function formatMilestoneDate(date: string, precision: MilestonePrecision, locale: Locale): string {
  return new Intl.DateTimeFormat(LOCALE_TAGS[locale].intl, { timeZone: 'UTC', ...PARTS[precision] }).format(
    new Date(`${date}T00:00:00Z`),
  );
}
