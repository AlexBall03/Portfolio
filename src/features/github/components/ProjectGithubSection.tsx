import Image from 'next/image';
import { Suspense, type CSSProperties, type ReactNode } from 'react';
import { Icon } from '@/components/ui/Icon';
import { RelativeTime } from '@/components/ui/RelativeTime';
import { Stat } from '@/components/ui/Stat';
import { Status } from '@/components/ui/Status';
import { Surface } from '@/components/ui/Surface';
import { copy, fill } from '@/config/copy';
import { INTL_LOCALE } from '@/config/site';
import { cn } from '@/lib/cn';
import { createLogger } from '@/lib/logger';
import { languageColor } from '../languages';
import { getProjectGithub } from '../project';
import type { Coverage, ProjectGithub, ProjectRepoRef } from '../types';
import { ActivityChart } from './ActivityChart';

const log = createLogger('github');

const t = copy.projectGithub;

const SUBHEAD = 'font-mono text-label tracking-[0.16em] text-fg-faint uppercase';
const external = { target: '_blank', rel: 'noopener noreferrer' } as const;

interface ProjectGithubSectionProps {
  repositories: ProjectRepoRef[];
}

/**
 * A project's live GitHub data: summary, weekly commit activity, languages,
 * repositories, recent commits, releases, and contributors. Streams in after
 * the page; whatever GitHub can't provide degrades on its own, and the page
 * around it never depends on GitHub.
 */
export function ProjectGithubSection(props: ProjectGithubSectionProps) {
  return (
    <Suspense fallback={<Placeholder loading />}>
      <Panel {...props} />
    </Suspense>
  );
}

async function Panel({ repositories }: ProjectGithubSectionProps) {
  let data: ProjectGithub | null = null;
  try {
    // Only the identifying fields: they are the cache key.
    data = await getProjectGithub(repositories.map(({ githubId, owner, name, label, isPrimary }) => ({ githubId, owner, name, label, isPrimary })));
  } catch (err) {
    log.error('Project GitHub analytics failed', err);
  }
  if (!data || data.status === 'unavailable' || data.status === 'unconfigured') return <Placeholder />;
  return <Content data={data} />;
}

function Placeholder({ loading }: { loading?: boolean }) {
  return (
    <Surface variant="inset" radius="xl" className="flex min-h-40 items-center justify-center p-8">
      {loading ? (
        <div className="flex w-full flex-col gap-3 motion-safe:animate-pulse" role="status">
          <span className="sr-only">{t.loading}</span>
          <span className="h-4 w-1/3 rounded-sm bg-fg/[0.06]" />
          <span className="h-28 w-full rounded-md bg-fg/[0.05]" />
        </div>
      ) : (
        <p className="text-body-sm text-fg-muted" role="status">
          {t.unavailable}
        </p>
      )}
    </Surface>
  );
}

function CoverageNote({ coverage }: { coverage: Coverage }) {
  if (coverage.covered === coverage.of) return null;
  return <p className="font-mono text-micro text-fg-faint">{fill(t.coverage, { covered: coverage.covered, of: coverage.of })}</p>;
}

function Block({ title, children, className }: { title: string; children: ReactNode; className?: string }) {
  return (
    <div className={cn('flex min-w-0 flex-col gap-4', className)}>
      <h3 className={SUBHEAD}>{title}</h3>
      {children}
    </div>
  );
}

/** Hairlines between stats: 2 columns on small screens, 3 from `sm`. */
const tileBorders = (i: number) =>
  cn(
    'border-line py-5 pr-4',
    i % 2 === 1 && 'max-sm:border-l max-sm:pl-5',
    i >= 2 && 'max-sm:border-t',
    i % 3 !== 0 && 'sm:border-l sm:pl-5',
    i >= 3 && 'sm:border-t',
  );

function Content({ data }: { data: ProjectGithub }) {
  const intl = INTL_LOCALE;
  const number = new Intl.NumberFormat(intl);
  const day = new Intl.DateTimeFormat(intl, { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' });
  interface Tile {
    value: number;
    label: string;
    note?: string;
    suffix?: string;
  }
  const tiles = ([
    { value: data.repositories.length, label: t.statRepositories },
    data.stars !== null && { value: data.stars, label: t.statStars },
    data.forks !== null && { value: data.forks, label: t.statForks },
    data.activity && { value: data.activity.total, label: t.statCommits, note: t.statCommitsNote },
    data.contributors && { value: data.contributors.total, label: t.statContributors },
    data.releases && { value: data.releases.count, label: t.statReleases, suffix: data.releases.capped ? '+' : undefined },
  ] as (Tile | false | null)[]).filter((x): x is Tile => Boolean(x));
  const pending = data.activity?.pending ?? 0;

  return (
    <div className="flex flex-col gap-10">
      <div className="flex flex-col gap-4">
        <dl className="grid grid-cols-2 border-y border-line sm:grid-cols-3">
          {tiles.map((s, i) => (
            <Stat
              key={s.label}
              value={s.value}
              suffix={s.suffix}
              label={s.label}
              note={s.note}
              className={tileBorders(i)}
            />
          ))}
        </dl>
        <div className="flex flex-wrap items-center gap-x-6 gap-y-2 font-mono text-micro text-fg-faint">
          {data.lastActivityAt && (
            <span>
              {t.lastActivity}: <RelativeTime iso={data.lastActivityAt} />
            </span>
          )}
          {data.unavailable > 0 && (
            <span>{data.unavailable === 1 ? t.unavailableOne : fill(t.unavailableMany, { count: data.unavailable })}</span>
          )}
        </div>
      </div>

      <Surface variant="glass" radius="xl" as="section" aria-label={t.activityTitle} className="flex flex-col gap-4 p-5 sm:p-7">
        <h3 className={SUBHEAD}>{t.activityTitle}</h3>
        {data.activity && data.activity.weeks.length > 0 ? (
          <ActivityChart weeks={data.activity.weeks} total={data.activity.total} />
        ) : data.activity ? (
          <p className="text-body-sm text-fg-muted">{t.activityEmpty}</p>
        ) : (
          !pending && <p className="text-body-sm text-fg-muted">{t.activityUnavailable}</p>
        )}
        {data.activity && <CoverageNote coverage={data.activity} />}
        {pending > 0 && (
          <p className="text-body-sm text-fg-muted" role="status">
            {pending === 1 ? t.activityPendingOne : fill(t.activityPendingMany, { count: pending })}
          </p>
        )}
      </Surface>

      <div className="grid gap-10 md:grid-cols-2">
        {data.languages && (
          <Block title={t.languagesTitle}>
            <div aria-hidden="true" className="flex h-2.5 gap-[2px] overflow-hidden rounded-full">
              {[...data.languages.items, ...(data.languages.otherShare > 0.0005 ? [{ name: '', share: data.languages.otherShare }] : [])].map((l) => (
                <span
                  key={l.name || 'other'}
                  className="h-full w-[var(--w)] min-w-[2px] bg-[var(--lang)] first:rounded-l-full last:rounded-r-full"
                  style={{ '--w': `${l.share * 100}%`, '--lang': l.name ? languageColor(l.name) : 'var(--line-strong)' } as CSSProperties}
                />
              ))}
            </div>
            <ul className="grid grid-cols-2 gap-x-6 gap-y-2 font-mono text-micro text-fg-muted">
              {data.languages.items.map((l) => (
                <li key={l.name} className="flex items-center gap-2">
                  <span
                    aria-hidden="true"
                    className="size-2 shrink-0 rounded-full bg-[var(--lang)]"
                    style={{ '--lang': languageColor(l.name) } as CSSProperties}
                  />
                  <span className="truncate text-fg">{l.name}</span>
                  <span className="ml-auto tabular-nums">{(l.share * 100).toFixed(1)}%</span>
                </li>
              ))}
              {data.languages.otherShare > 0.0005 && (
                <li className="flex items-center gap-2">
                  <span aria-hidden="true" className="size-2 shrink-0 rounded-full bg-line-strong" />
                  <span className="text-fg">{t.languageOther}</span>
                  <span className="ml-auto tabular-nums">{(data.languages.otherShare * 100).toFixed(1)}%</span>
                </li>
              )}
            </ul>
            <p className="text-micro text-fg-faint">{t.languagesCaption}</p>
            <CoverageNote coverage={data.languages} />
          </Block>
        )}

        {data.contributors && data.contributors.total > 0 && (
          <Block title={t.contributorsTitle}>
            <ul className="flex flex-wrap gap-2">
              {data.contributors.top.map((c) => (
                <li key={c.id}>
                  <a
                    href={c.url}
                    {...external}
                    title={c.login}
                    className="block size-9 overflow-hidden rounded-full border border-line transition-colors hover:border-brand focus-visible:outline-2 focus-visible:outline-focus"
                  >
                    <Image src={c.avatarUrl} alt={c.login} width={36} height={36} className="size-full object-cover" />
                  </a>
                </li>
              ))}
              {data.contributors.total > data.contributors.top.length && (
                <li className="grid h-9 place-items-center px-2 font-mono text-micro text-fg-faint">
                  {fill(t.contributorsMore, { count: data.contributors.total - data.contributors.top.length })}
                </li>
              )}
            </ul>
            <p className="text-micro text-fg-faint">{t.contributorsCaption}</p>
            <CoverageNote coverage={data.contributors} />
          </Block>
        )}
      </div>

      <Block title={t.repositoriesTitle}>
        <ul className="divide-y divide-line border-y border-line">
          {data.repositories.map((r) => (
            <li key={r.id}>
              <a className="group flex flex-col gap-1.5 py-4" href={r.url} {...external}>
                <span className="flex flex-wrap items-center gap-2 font-mono text-body-sm text-fg transition-colors group-hover:text-brand-fg [&_svg]:size-3.5">
                  <Icon name="github" className="text-fg-faint" />
                  {r.fullName}
                  {r.label && <Status>{t.labels[r.label]}</Status>}
                  {r.isPrimary && data.repositories.length > 1 && <Status tone="brand">{t.primary}</Status>}
                  {r.archived && <Status>{t.archived}</Status>}
                  <Icon name="arrowUpRight" className="ml-auto text-fg-faint transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                </span>
                {r.description && <span className="line-clamp-2 text-body-sm text-fg-muted">{r.description}</span>}
                <span className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 font-mono text-micro text-fg-faint">
                  {r.language && (
                    <span className="flex items-center gap-1.5">
                      <span aria-hidden="true" className="size-2 rounded-full bg-[var(--lang)]" style={{ '--lang': languageColor(r.language) } as CSSProperties} />
                      {r.language}
                    </span>
                  )}
                  <span>
                    <span aria-hidden="true">★</span>
                    <span className="sr-only">{t.statStars}</span> {number.format(r.stars)}
                  </span>
                  <span>
                    {t.statForks} {number.format(r.forks)}
                  </span>
                  {r.periodCommits !== null && (
                    <span>{r.periodCommits === 1 ? t.periodCommitsOne : fill(t.periodCommits, { count: number.format(r.periodCommits) })}</span>
                  )}
                </span>
              </a>
            </li>
          ))}
        </ul>
      </Block>

      <div className="grid gap-10 lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)]">
        {data.commits && data.commits.length > 0 && (
          <Block title={t.commitsTitle}>
            <ol className="ml-1 border-l border-line">
              {data.commits.map((c) => (
                <li key={c.sha} className="relative flex flex-col gap-1 py-2.5 pl-6">
                  <span aria-hidden="true" className="absolute top-[1rem] -left-[4.5px] size-2 rounded-full border border-brand-fg bg-canvas" />
                  <a href={c.url} {...external} className="line-clamp-2 text-body-sm text-fg-muted transition-colors hover:text-fg">
                    {c.message}
                  </a>
                  <span className="flex flex-wrap gap-x-3 font-mono text-micro text-fg-faint">
                    <span>{c.sha.slice(0, 7)}</span>
                    {data.repositories.length > 1 && <span>{c.repository}</span>}
                    <RelativeTime iso={c.date} />
                  </span>
                </li>
              ))}
            </ol>
          </Block>
        )}

        {data.releases && (
          <Block title={t.releasesTitle}>
            {data.releases.recent.length ? (
              <ul className="divide-y divide-line border-y border-line">
                {data.releases.recent.map((r) => (
                  <li key={r.id}>
                    <a href={r.url} {...external} className="group flex flex-col gap-1 py-3">
                      <span className="flex flex-wrap items-center gap-2 font-mono text-body-sm text-fg transition-colors group-hover:text-brand-fg">
                        {r.tag}
                        {r.prerelease && <Status>{t.prerelease}</Status>}
                      </span>
                      {r.name && r.name !== r.tag && <span className="line-clamp-1 text-body-sm text-fg-muted">{r.name}</span>}
                      <span className="flex flex-wrap gap-x-3 font-mono text-micro text-fg-faint">
                        <time dateTime={r.publishedAt}>{day.format(new Date(r.publishedAt))}</time>
                        {data.repositories.length > 1 && <span>{r.repository}</span>}
                      </span>
                    </a>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-body-sm text-fg-muted">{t.releasesNone}</p>
            )}
            <CoverageNote coverage={data.releases} />
          </Block>
        )}
      </div>
    </div>
  );
}
