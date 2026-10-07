import { Suspense, type CSSProperties } from 'react';
import { buttonStyles } from '@/components/ui/button-styles';
import { CountUp } from '@/components/ui/CountUp';
import { Icon } from '@/components/ui/Icon';
import { RelativeTime } from '@/components/ui/RelativeTime';
import { Reveal } from '@/components/ui/Reveal';
import { Section } from '@/components/ui/Section';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { Stat, statDividers } from '@/components/ui/Stat';
import { Surface } from '@/components/ui/Surface';
import type { SectionContent } from '@/features/site/types';
import { LOCALE_TAGS, type Locale } from '@/i18n/config';
import type { Dictionary } from '@/i18n/get-dictionary';
import { fill } from '@/i18n/paths';
import { cn } from '@/lib/cn';
import { createLogger } from '@/lib/logger';
import { describeActivity } from '../events';
import { getGithubOverview } from '../overview';
import type { GithubOverview } from '../types';
import { ContributionHeatmap, HeatmapLegend } from './ContributionHeatmap';

const log = createLogger('github');

const LANGUAGE_COLORS: Record<string, string> = {
  JavaScript: '#f1e05a',
  TypeScript: '#3178c6',
  Python: '#3572A5',
  'C#': '#9b6dd6',
  Java: '#b07219',
  HTML: '#e34c26',
  CSS: '#563d7c',
  Shell: '#89e051',
  Go: '#00ADD8',
  Rust: '#dea584',
  'C++': '#f34b7d',
  C: '#555555',
  PHP: '#4F5D95',
  Ruby: '#701516',
};

const SUBHEAD = 'font-mono text-label tracking-[0.16em] text-fg-faint uppercase';

interface GitHubSectionProps {
  section: SectionContent;
  username: string;
  displayName: string;
  locale: Locale;
  t: Dictionary['github'];
}

/** Engineering activity: overview → contributions → repositories → recent activity. */
export function GitHubSection(props: GitHubSectionProps) {
  return (
    <Section id="github" labelledBy="github-title">
      <SectionHeader index="05" content={props.section} id="github-title" />
      <Suspense fallback={<GitHubFallback {...props} loading />}>
        <GitHubPanel {...props} />
      </Suspense>
    </Section>
  );
}

async function GitHubPanel(props: GitHubSectionProps) {
  let overview: GithubOverview | null = null;
  try {
    overview = await getGithubOverview(props.username);
  } catch (err) {
    log.error('GitHub overview failed', err);
  }
  if (!overview || (!overview.stats && !overview.repositories && !overview.calendar)) {
    return <GitHubFallback {...props} />;
  }
  return <GitHubContent {...props} overview={overview} />;
}

function Identity({ username, displayName, t }: GitHubSectionProps) {
  const url = `https://github.com/${username}`;
  return (
    <div className="flex flex-wrap items-center justify-between gap-4">
      <div className="flex items-center gap-4">
        <span className="grid size-11 place-items-center rounded-full border border-line bg-surface-raised text-fg [&_svg]:size-5">
          <Icon name="github" />
        </span>
        <div className="flex flex-col">
          <span className="font-display font-semibold text-fg">{displayName}</span>
          <a className="font-mono text-label text-fg-muted transition-colors hover:text-brand-fg" href={url} target="_blank" rel="noopener noreferrer">
            @{username}
          </a>
        </div>
      </div>
      <a className={buttonStyles({ variant: 'secondary', size: 'sm' })} href={url} target="_blank" rel="noopener noreferrer">
        {t.follow} <Icon name="arrowUpRight" />
      </a>
    </div>
  );
}

function GitHubFallback(props: GitHubSectionProps & { loading?: boolean }) {
  return (
    <div className="flex flex-col gap-10">
      <Identity {...props} />
      <Surface variant="inset" radius="xl" className="flex min-h-48 items-center justify-center p-8">
        {props.loading ? (
          <div className="flex w-full max-w-2xl flex-col gap-3 motion-safe:animate-pulse" role="status">
            <span className="sr-only">{props.t.loading}</span>
            <span className="h-4 w-1/3 rounded-sm bg-fg/[0.06]" />
            <span className="h-28 w-full rounded-md bg-fg/[0.05]" />
          </div>
        ) : (
          <p className="text-body-sm text-fg-muted" role="status">
            {props.t.unavailable}
          </p>
        )}
      </Surface>
    </div>
  );
}

function GitHubContent(props: GitHubSectionProps & { overview: GithubOverview }) {
  const { overview, locale, t } = props;
  const intl = LOCALE_TAGS[locale].intl;
  const stats = overview.stats;
  const tiles = stats
    ? [
        { value: stats.repositories, label: t.statRepos },
        { value: stats.stars, label: t.statStars },
        { value: stats.forks, label: t.statForks },
        { value: stats.followers, label: t.statFollowers },
      ]
    : [];
  const repos = overview.repositories ?? [];
  const activity = overview.activity ?? [];

  return (
    <div className="flex flex-col gap-14">
      <Reveal className="flex flex-col gap-8">
        <Identity {...props} />
        {tiles.length > 0 && (
          <dl className="grid grid-cols-2 border-y border-line lg:grid-cols-4">
            {tiles.map((s, i) => (
              <Stat key={s.label} value={s.value} label={s.label} className={cn('py-6 pr-4', statDividers(i), i % 2 === 1 && 'pl-5 sm:pl-8', i > 0 && 'lg:pl-8')} />
            ))}
          </dl>
        )}
      </Reveal>

      <Reveal>
        <Surface variant="glass" radius="xl" as="section" className="grid gap-8 p-5 sm:p-8 lg:grid-cols-[minmax(0,1fr)_14rem] lg:gap-12">
          {overview.calendar ? (
            <>
              <ContributionHeatmap calendar={overview.calendar} locale={locale} t={t} />
              <div className="flex flex-col justify-between gap-6 lg:border-l lg:border-line lg:pl-10">
                <div className="flex flex-col gap-2">
                  <h3 className={SUBHEAD}>{t.contributions}</h3>
                  <p className="font-display text-h1 font-semibold text-fg tabular-nums">
                    <CountUp value={overview.calendar.total} />
                  </p>
                  <p className="text-body-sm text-fg-muted">{fill(t.contributionsCaption, { count: overview.calendar.total })}</p>
                </div>
                <div className="flex flex-col gap-3">
                  <HeatmapLegend t={t} />
                  {overview.lastActivityAt && (
                    <p className="font-mono text-micro text-fg-faint">
                      {t.lastActivity}: <RelativeTime iso={overview.lastActivityAt} locale={intl} />
                    </p>
                  )}
                </div>
              </div>
            </>
          ) : (
            <p className="text-body-sm text-fg-muted lg:col-span-2">{t.calendarUnavailable}</p>
          )}
        </Surface>
      </Reveal>

      {(repos.length > 0 || activity.length > 0) && (
        <div className="grid gap-14 lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)] lg:gap-16">
          {repos.length > 0 && (
            <Reveal>
              <h3 className={SUBHEAD}>{t.repositories}</h3>
              <ul className="mt-4 divide-y divide-line border-y border-line">
                {repos.map((r) => (
                  <li key={r.name}>
                    <a className="group flex flex-col gap-1.5 py-5" href={r.url} target="_blank" rel="noopener noreferrer">
                      <span className="flex items-center gap-2 font-mono text-body-sm text-fg transition-colors group-hover:text-brand-fg [&_svg]:size-3.5">
                        <Icon name="branch" className="text-fg-faint" />
                        {r.name}
                        <Icon name="arrowUpRight" className="ml-auto text-fg-faint opacity-0 transition-opacity group-hover:opacity-100" />
                      </span>
                      {r.description && <span className="line-clamp-2 text-body-sm text-fg-muted">{r.description}</span>}
                      <span className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 font-mono text-micro text-fg-faint">
                        {r.language && (
                          <span className="flex items-center gap-1.5">
                            <span
                              className="size-2 rounded-full bg-[var(--lang)]"
                              style={{ '--lang': LANGUAGE_COLORS[r.language] ?? 'var(--fg-faint)' } as CSSProperties}
                            />
                            {r.language}
                          </span>
                        )}
                        {r.pushedAt && (
                          <span>
                            {t.updated} <RelativeTime iso={r.pushedAt} locale={intl} />
                          </span>
                        )}
                      </span>
                    </a>
                  </li>
                ))}
              </ul>
            </Reveal>
          )}

          {activity.length > 0 && (
            <Reveal delay={80}>
              <h3 className={SUBHEAD}>{t.recentActivity}</h3>
              <ol className="mt-4 ml-1 border-l border-line">
                {activity.map((a, i) => (
                  <li key={`${a.createdAt}-${i}`} className="relative flex flex-col gap-1 py-3 pl-6">
                    <span aria-hidden="true" className="absolute top-[1.15rem] -left-[4.5px] size-2 rounded-full border border-brand-fg bg-canvas" />
                    <span className="text-body-sm text-fg-muted">
                      {describeActivity(a, t.events)}{' '}
                      <a className="font-mono text-brand-fg hover:text-fg" href={a.repositoryUrl} target="_blank" rel="noopener noreferrer">
                        {a.repository}
                      </a>
                    </span>
                    <span className="font-mono text-micro text-fg-faint">
                      <RelativeTime iso={a.createdAt} locale={intl} />
                    </span>
                  </li>
                ))}
              </ol>
            </Reveal>
          )}
        </div>
      )}
    </div>
  );
}
