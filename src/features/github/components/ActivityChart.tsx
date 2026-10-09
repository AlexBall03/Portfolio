import type { CSSProperties } from 'react';
import type { Dictionary } from '@/i18n/get-dictionary';
import { fill } from '@/i18n/paths';
import { cn } from '@/lib/cn';
import type { ActivityWeek } from '../types';

type T = Dictionary['projectGithub'];

const utc = (week: string) => new Date(`${week}T00:00:00Z`);

/** Weekly totals grouped by calendar month (UTC) of each week's Sunday, for the table view. */
export function monthlyTotals(weeks: readonly ActivityWeek[]): { month: string; count: number }[] {
  const months = new Map<string, number>();
  for (const w of weeks) months.set(w.week.slice(0, 7), (months.get(w.week.slice(0, 7)) ?? 0) + w.count);
  return [...months].map(([month, count]) => ({ month, count }));
}

interface ActivityChartProps {
  weeks: ActivityWeek[];
  total: number;
  intl: string;
  t: T;
}

/**
 * Weekly commit bars, one series (no legend: the heading names it). Bars
 * grow from a shared baseline with a 2px gap; each has a hover tooltip, and
 * the same numbers are in a screen-reader table grouped by month. Rendered
 * on the server from data dates only (UTC), so cached output never drifts.
 */
export function ActivityChart({ weeks, total, intl, t }: ActivityChartProps) {
  const day = new Intl.DateTimeFormat(intl, { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' });
  const monthName = new Intl.DateTimeFormat(intl, { month: 'short', timeZone: 'UTC' });
  const monthYear = new Intl.DateTimeFormat(intl, { month: 'long', year: 'numeric', timeZone: 'UTC' });
  const max = Math.max(1, ...weeks.map((w) => w.count));
  const from = day.format(utc(weeks[0]!.week));
  const to = day.format(utc(weeks.at(-1)!.week));
  // Axis ticks: the first week of every other month, so labels never collide.
  let lastMonth = '';
  const ticks = new Set<number>();
  weeks.forEach((w, i) => {
    const m = w.week.slice(0, 7);
    if (m !== lastMonth) {
      if (Number(m.slice(5)) % 2 === 1) ticks.add(i);
      lastMonth = m;
    }
  });

  return (
    <figure className="flex flex-col gap-4">
      <div
        role="img"
        aria-label={fill(t.activityLabel, { from, to, count: total })}
        className="relative flex h-40 items-end gap-[2px] border-b border-line-strong pt-5 sm:h-48"
      >
        {/* One recessive gridline at the peak week, labeled with its value. */}
        <span aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-5 border-t border-dashed border-line" />
        <span aria-hidden="true" className="absolute top-0 left-0 font-mono text-micro text-fg-faint tabular-nums">
          {max}
        </span>
        {weeks.map((w) => {
          const label = fill(w.count === 1 ? t.activityBarOne : t.activityBarMany, { count: w.count, date: day.format(utc(w.week)) });
          return (
            <div key={w.week} className="group relative flex h-full min-w-0 flex-1 items-end">
              <span
                aria-hidden="true"
                className={cn(
                  'block h-[var(--h)] w-full rounded-t-[3px] bg-brand transition-opacity duration-200 group-hover:opacity-80',
                  !w.count && 'opacity-25',
                )}
                style={{ '--h': w.count ? `max(3px, ${(w.count / max) * 100}%)` : '1px' } as CSSProperties}
              />
              <span
                aria-hidden="true"
                className="pointer-events-none absolute bottom-full left-1/2 z-10 mb-2 hidden -translate-x-1/2 rounded-sm border border-line bg-surface-raised px-2 py-1 font-mono text-micro whitespace-nowrap text-fg shadow-md group-hover:block"
              >
                {label}
              </span>
            </div>
          );
        })}
      </div>
      <div aria-hidden="true" className="relative h-4 font-mono text-micro text-fg-faint">
        {[...ticks].map((i) => (
          <span key={i} className="absolute left-[var(--x)]" style={{ '--x': `${(i / weeks.length) * 100}%` } as CSSProperties}>
            {monthName.format(utc(weeks[i]!.week))}
          </span>
        ))}
      </div>
      <figcaption className="text-body-sm text-fg-muted">{fill(t.activityCaption, { from, to })}</figcaption>
      <table className="sr-only">
        <caption>{t.activityTitle}</caption>
        <thead>
          <tr>
            <th scope="col">{t.tableMonth}</th>
            <th scope="col">{t.tableCommits}</th>
          </tr>
        </thead>
        <tbody>
          {monthlyTotals(weeks).map((m) => (
            <tr key={m.month}>
              <th scope="row">{monthYear.format(utc(`${m.month}-01`))}</th>
              <td>{m.count}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </figure>
  );
}
