'use client';

import { useEffect, useId, useMemo, useState, type ReactNode } from 'react';
import { buttonStyles } from '@/components/ui/button-styles';
import { Icon } from '@/components/ui/Icon';
import type { Dictionary } from '@/i18n/get-dictionary';
import { fill } from '@/i18n/paths';
import { cn } from '@/lib/cn';
import {
  filterProjects,
  filtersToQuery,
  hasFilters,
  NO_FILTERS,
  parseFilters,
  type FilterableProject,
  type ProjectFilters,
} from '../filter';
import type { TechnologyUsage } from '../technologies';

interface ProjectExplorerProps {
  /** Every published project in CMS order (featured first), as match data. */
  entries: FilterableProject[];
  /** Each project's server-rendered card, by id. */
  cards: Record<string, ReactNode>;
  technologies: TechnologyUsage[];
  t: Dictionary['projects'];
}

/**
 * Search and filters over the projects list. The cards are Server Components
 * rendered into the HTML; this island only decides which of them to show, so
 * the full list is crawlable and works without JavaScript. Filters live in the
 * URL (`?q=&tech=&live=1`) for sharing and for links from skills, read after
 * mount so the page itself stays prerendered.
 */
export function ProjectExplorer({ entries, cards, technologies, t }: ProjectExplorerProps) {
  const [filters, setFilters] = useState<ProjectFilters>(NO_FILTERS);
  const known = useMemo(() => new Set(technologies.map((x) => x.slug)), [technologies]);
  const searchId = useId();
  const anyLive = entries.some((e) => e.isLive);

  // Adopt the URL's filters once mounted (deep links from skills, shared URLs).
  useEffect(() => {
    const initial = parseFilters(new URLSearchParams(window.location.search), known);
    // eslint-disable-next-line react-hooks/set-state-in-effect -- one-time sync from the URL, unavailable during prerender
    if (hasFilters(initial)) setFilters(initial);
  }, [known]);

  const update = (next: ProjectFilters) => {
    setFilters(next);
    const url = `${window.location.pathname}${filtersToQuery(next)}${window.location.hash}`;
    window.history.replaceState(window.history.state, '', url);
  };

  const toggleTech = (slug: string) =>
    update({
      ...filters,
      techs: filters.techs.includes(slug) ? filters.techs.filter((s) => s !== slug) : [...filters.techs, slug],
    });

  const visible = filterProjects(entries, filters);
  const featured = visible.filter((e) => e.featured);
  const others = visible.filter((e) => !e.featured);
  const active = hasFilters(filters);
  const total = entries.length;
  const summary = !active
    ? fill(t.resultsAll, { count: total })
    : fill(visible.length === 1 ? t.resultsOne : t.resultsMany, { count: visible.length, total });

  return (
    <>
      <div role="search" aria-label={t.filters} className="mb-10 flex flex-col gap-5 border-y border-line py-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <label htmlFor={searchId} className="sr-only">
            {t.search}
          </label>
          <div className="relative flex-1">
            <Icon
              name="search"
              className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-fg-faint"
            />
            <input
              id={searchId}
              type="search"
              value={filters.query}
              onChange={(e) => update({ ...filters, query: e.target.value })}
              placeholder={t.searchPlaceholder}
              autoComplete="off"
              spellCheck={false}
              maxLength={100}
              className="h-11 w-full rounded-md border border-line-strong bg-surface-inset/70 pr-4 pl-10 text-base text-fg transition-[border-color,box-shadow,background-color] placeholder:text-fg-faint hover:border-fg/25 focus:border-brand focus:bg-surface-inset focus:shadow-[0_0_0_4px_color-mix(in_oklab,var(--focus)_18%,transparent)] focus:outline-none"
            />
          </div>
          <div className="flex items-center gap-3">
            {anyLive && (
              <button
                type="button"
                aria-pressed={filters.liveOnly}
                onClick={() => update({ ...filters, liveOnly: !filters.liveOnly })}
                className={cn(CHIP, 'h-11 px-4', filters.liveOnly ? CHIP_ON_LIVE : CHIP_OFF)}
              >
                <span aria-hidden="true" className="size-1.5 rounded-full bg-success" />
                {t.liveOnly}
              </button>
            )}
            {active && (
              <button type="button" onClick={() => update(NO_FILTERS)} className={buttonStyles({ variant: 'ghost', size: 'sm' })}>
                <Icon name="x" /> {t.clearFilters}
              </button>
            )}
          </div>
        </div>

        {technologies.length > 0 && (
          <div role="group" aria-label={t.technologies} className="flex flex-wrap gap-2">
            {technologies.map((tech) => {
              const on = filters.techs.includes(tech.slug);
              return (
                <button
                  key={tech.slug}
                  type="button"
                  aria-pressed={on}
                  onClick={() => toggleTech(tech.slug)}
                  className={cn(CHIP, 'h-8 px-3', on ? CHIP_ON : CHIP_OFF)}
                >
                  {tech.name}
                  <span className={cn('tabular-nums', on ? 'text-brand-fg/80' : 'text-fg-faint')}>{tech.count}</span>
                </button>
              );
            })}
          </div>
        )}

        <p aria-live="polite" className="font-mono text-micro tracking-[0.14em] text-fg-faint uppercase">
          {summary}
        </p>
      </div>

      {visible.length === 0 && (
        <div className="flex flex-col items-start gap-4 rounded-xl border border-dashed border-line-strong px-6 py-12 sm:px-10">
          <p className="font-display text-h3 text-fg">{t.noResults}</p>
          <p className="text-body text-fg-muted">{t.noResultsLead}</p>
          <button type="button" onClick={() => update(NO_FILTERS)} className={buttonStyles({ variant: 'secondary', size: 'sm' })}>
            {t.clearFilters}
          </button>
        </div>
      )}

      {featured.length > 0 && (
        <div className="flex flex-col gap-8">
          {featured.map((e) => (
            <div key={e.id}>{cards[e.id]}</div>
          ))}
        </div>
      )}

      {others.length > 0 && (
        <div className={cn('grid gap-6 md:grid-cols-2', featured.length > 0 && 'mt-8')}>
          {others.map((e) => (
            <div key={e.id}>{cards[e.id]}</div>
          ))}
        </div>
      )}
    </>
  );
}

const CHIP =
  'inline-flex items-center gap-2 rounded-full border font-mono text-micro whitespace-nowrap transition-[background-color,border-color,color] duration-200 ease-standard focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus';
const CHIP_OFF = 'border-line-strong bg-surface-raised/40 text-fg-muted hover:border-brand/45 hover:text-fg';
const CHIP_ON = 'border-brand/50 bg-brand-soft text-brand-fg';
const CHIP_ON_LIVE = 'border-success/40 bg-success/10 text-success';
