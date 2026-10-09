import type { CSSProperties } from 'react';
import type { ContributionCalendar, ContributionDay } from '../types';
import { copy, fill } from '@/config/copy';
import { INTL_LOCALE } from '@/config/site';

const t = copy.github;

function cellLabel(day: ContributionDay, dateFmt: Intl.DateTimeFormat): string {
  // Calendar dates are formatted in UTC so "2026-10-06" never shifts a day.
  const date = dateFmt.format(new Date(`${day.date}T00:00:00Z`));
  if (day.count === 0) return fill(t.cellNone, { date });
  return fill(day.count === 1 ? t.cellOne : t.cellMany, { count: day.count, date });
}

/**
 * One entry per week column: a month name over the first week that contains
 * that month's 1st–7th, otherwise null. Labels closer than 3 weeks are dropped.
 */
function monthLabels(calendar: ContributionCalendar, monthFmt: Intl.DateTimeFormat): (string | null)[] {
  const labels: (string | null)[] = [];
  let lastLabelled = -3;
  calendar.weeks.forEach((week, w) => {
    const first = week.find((d): d is ContributionDay => d !== null);
    if (!first || Number(first.date.slice(8, 10)) > 7 || w - lastLabelled < 3) {
      labels.push(null);
      return;
    }
    lastLabelled = w;
    labels.push(monthFmt.format(new Date(`${first.date}T00:00:00Z`)));
  });
  return labels;
}

const COLUMNS = 'grid gap-[3px] [grid-template-columns:repeat(var(--weeks),minmax(0,1fr))]';

/**
 * Week columns × 7 weekday rows. The grid flows by column, so cells are
 * emitted week by week; future days are invisible placeholders that keep
 * every row aligned to its weekday. One summarized image for assistive tech;
 * per-day detail is in hover titles, not tab stops.
 */
export function ContributionHeatmap({ calendar }: { calendar: ContributionCalendar }) {
  const intl = INTL_LOCALE;
  const dateFmt = new Intl.DateTimeFormat(intl, { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' });
  const monthFmt = new Intl.DateTimeFormat(intl, { month: 'short', timeZone: 'UTC' });
  const weeks = { '--weeks': calendar.weeks.length } as CSSProperties;

  const months = monthLabels(calendar, monthFmt);

  return (
    <div className="min-w-0">
      <div aria-hidden="true" className={`${COLUMNS} mb-2 h-4`} style={weeks}>
        {months.map((m, w) => (
          <span key={w} className="font-mono text-micro whitespace-nowrap text-fg-faint">
            {m}
          </span>
        ))}
      </div>
      <div
        role="img"
        aria-label={fill(t.calendarLabel, { count: calendar.total })}
        className={`${COLUMNS} grid-flow-col grid-rows-7`}
        style={weeks}
      >
        {calendar.weeks.flatMap((week, w) =>
          week.map((day, d) =>
            day ? (
              <span key={day.date} className="heat-cell aspect-square rounded-[3px]" data-level={day.level} title={cellLabel(day, dateFmt)} />
            ) : (
              <span key={`pad-${w}-${d}`} className="invisible aspect-square" />
            ),
          ),
        )}
      </div>
    </div>
  );
}

export function HeatmapLegend() {
  return (
    <div aria-hidden="true" className="flex items-center gap-1.5 font-mono text-micro text-fg-faint">
      <span className="mr-1">{t.less}</span>
      {[0, 1, 2, 3, 4].map((level) => (
        <span key={level} className="heat-cell size-2.5 rounded-[2px]" data-level={level} />
      ))}
      <span className="ml-1">{t.more}</span>
    </div>
  );
}
