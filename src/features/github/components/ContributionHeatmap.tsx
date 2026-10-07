import { LOCALE_TAGS, type Locale } from '@/i18n/config';
import type { Dictionary } from '@/i18n/get-dictionary';
import { fill } from '@/i18n/paths';
import type { ContributionCalendar, ContributionDay } from '../types';

function cellLabel(day: ContributionDay, dateFmt: Intl.DateTimeFormat, t: Dictionary['github']): string {
  // Calendar dates are formatted in UTC so "2026-10-06" never shifts a day.
  const date = dateFmt.format(new Date(`${day.date}T00:00:00Z`));
  if (day.count === 0) return fill(t.cellNone, { date });
  return fill(day.count === 1 ? t.cellOne : t.cellMany, { count: day.count, date });
}

/**
 * 26 week columns × 7 weekday rows. The grid flows by column, so cells are
 * emitted week by week; future days are invisible placeholders that keep
 * every row aligned to its weekday.
 */
export function ContributionHeatmap({
  calendar,
  locale,
  t,
}: {
  calendar: ContributionCalendar;
  locale: Locale;
  t: Dictionary['github'];
}) {
  const dateFmt = new Intl.DateTimeFormat(LOCALE_TAGS[locale].intl, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'UTC',
  });

  return (
    <>
      <div
        className="gh-contrib"
        role="img"
        aria-label={fill(t.calendarLabel, { count: calendar.total })}
        style={{ gridTemplateColumns: `repeat(${calendar.weeks.length}, 1fr)` }}
      >
        {calendar.weeks.flatMap((week, w) =>
          week.map((day, d) =>
            day ? (
              <span key={day.date} className={`gh-cell ${day.level ? `l${day.level}` : ''}`} title={cellLabel(day, dateFmt, t)} />
            ) : (
              <span key={`pad-${w}-${d}`} className="gh-cell" style={{ visibility: 'hidden' }} />
            ),
          ),
        )}
      </div>
      <div className="gh-legend" aria-hidden="true">
        <span>{t.less}</span>
        <span className="lg gh-cell" />
        <span className="lg gh-cell l1" />
        <span className="lg gh-cell l2" />
        <span className="lg gh-cell l3" />
        <span className="lg gh-cell l4" />
        <span>{t.more}</span>
      </div>
    </>
  );
}
