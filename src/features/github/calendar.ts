import type { ContributionCalendar, ContributionDay, ContributionLevel } from './types';

export const CALENDAR_WEEKS = 26;
const DAY_MS = 86_400_000;

const LEVELS: Record<string, ContributionLevel> = {
  NONE: 0,
  FIRST_QUARTILE: 1,
  SECOND_QUARTILE: 2,
  THIRD_QUARTILE: 3,
  FOURTH_QUARTILE: 4,
};

export const toLevel = (githubLevel: string): ContributionLevel => LEVELS[githubLevel] ?? 0;

const parseDate = (iso: string) => Date.UTC(+iso.slice(0, 4), +iso.slice(5, 7) - 1, +iso.slice(8, 10));
const formatDate = (ms: number) => new Date(ms).toISOString().slice(0, 10);

/** First day (Sunday) of the calendar window that ends in the week containing `today`. */
export function calendarStart(today: string, weeks = CALENDAR_WEEKS): string {
  const end = parseDate(today);
  const weekStart = end - new Date(end).getUTCDay() * DAY_MS;
  return formatDate(weekStart - (weeks - 1) * 7 * DAY_MS);
}

/**
 * Builds a week-aligned grid ending at `today`. Columns are Sunday-start weeks,
 * so row N is always the same weekday. The final week is padded with `null`
 * for days that haven't happened yet; days without data count as zero.
 */
export function buildCalendar(
  days: readonly ContributionDay[],
  today: string,
  weeks = CALENDAR_WEEKS,
): ContributionCalendar {
  const byDate = new Map(days.map((d) => [d.date, d]));
  const start = parseDate(calendarStart(today, weeks));
  const end = parseDate(today);

  let total = 0;
  const grid: (ContributionDay | null)[][] = [];
  for (let w = 0; w < weeks; w++) {
    const week: (ContributionDay | null)[] = [];
    for (let d = 0; d < 7; d++) {
      const ms = start + (w * 7 + d) * DAY_MS;
      if (ms > end) {
        week.push(null);
        continue;
      }
      const date = formatDate(ms);
      const day = byDate.get(date) ?? { date, count: 0, level: 0 as const };
      total += day.count;
      week.push(day);
    }
    grid.push(week);
  }
  return { weeks: grid, total };
}
