import { LOCALE_TAGS, type Locale } from '@/i18n/config';
import type { Experience } from './types';

interface RangeLabels {
  present: string;
  expected: string;
}

/**
 * Formats an experience's date range for display, e.g. "Mar 2026 — Present",
 * "2017 — 2021", or "Feb 2024 — Feb 2028 (Expected)". Dates are calendar dates,
 * so they are formatted in UTC to avoid shifting across time zones.
 */
export function formatExperienceRange(
  item: Pick<Experience, 'startDate' | 'endDate' | 'datePrecision'>,
  locale: Locale,
  labels: RangeLabels,
  today: Date = new Date(),
): string {
  const fmt = new Intl.DateTimeFormat(LOCALE_TAGS[locale].intl, {
    timeZone: 'UTC',
    year: 'numeric',
    ...(item.datePrecision === 'month' ? { month: 'short' } : {}),
  });
  const start = fmt.format(new Date(`${item.startDate}T00:00:00Z`));
  if (!item.endDate) return `${start} — ${labels.present}`;

  const end = new Date(`${item.endDate}T00:00:00Z`);
  const suffix = end.getTime() > today.getTime() ? ` (${labels.expected})` : '';
  return `${start} — ${fmt.format(end)}${suffix}`;
}
