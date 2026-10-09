import { copy } from '@/config/copy';
import { INTL_LOCALE } from '@/config/site';
import type { Experience } from './types';

/**
 * Formats an experience's date range for display, e.g. "Mar 2026 — Present",
 * "2017 — 2021", or "Feb 2024 — Feb 2028 (Expected)" for a current entry with a
 * planned end. Deterministic (no clock reads), so it is safe in cached pages.
 * Dates are calendar dates, formatted in UTC so they never shift a day.
 */
export function formatExperienceRange(
  item: Pick<Experience, 'startDate' | 'endDate' | 'datePrecision' | 'isCurrent'>,
): string {
  const fmt = new Intl.DateTimeFormat(INTL_LOCALE, {
    timeZone: 'UTC',
    year: 'numeric',
    ...(item.datePrecision === 'month' ? { month: 'short' } : {}),
  });
  const start = fmt.format(new Date(`${item.startDate}T00:00:00Z`));
  if (!item.endDate) return `${start} — ${copy.experience.present}`;

  const end = fmt.format(new Date(`${item.endDate}T00:00:00Z`));
  return item.isCurrent ? `${start} — ${end} (${copy.experience.expected})` : `${start} — ${end}`;
}
