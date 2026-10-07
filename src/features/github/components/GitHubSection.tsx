import { Suspense } from 'react';
import { CountUp } from '@/components/ui/CountUp';
import { Icon } from '@/components/ui/Icon';
import { RelativeTime } from '@/components/ui/RelativeTime';
import { Reveal } from '@/components/ui/Reveal';
import { SectionHead } from '@/components/ui/SectionHead';
import type { SectionContent } from '@/features/site/types';
import { LOCALE_TAGS, type Locale } from '@/i18n/config';
import type { Dictionary } from '@/i18n/get-dictionary';
import { fill } from '@/i18n/paths';
import { createLogger } from '@/lib/logger';
import { describeActivity } from '../events';
import { getGithubOverview } from '../overview';
import type { GithubOverview } from '../types';
import { ContributionHeatmap } from './ContributionHeatmap';

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

interface GitHubSectionProps {
  section: SectionContent;
  username: string;
  displayName: string;
  locale: Locale;
  t: Dictionary['github'];
}

export function GitHubSection(props: GitHubSectionProps) {
  return (
    <section id="github" className="band" aria-labelledby="github-title">
      <div className="wrap">
        <SectionHead index="05" content={props.section} id="github-title" />
        <Suspense fallback={<GitHubFallback {...props} message={props.t.loading} />}>
          <GitHubPanel {...props} />
        </Suspense>
      </div>
    </section>
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
    return <GitHubFallback {...props} message={props.t.unavailable} />;
  }
  return <GitHubContent {...props} overview={overview} />;
}

function UserHead({ username, displayName, t }: GitHubSectionProps) {
  const url = `https://github.com/${username}`;
  return (
    <div className="gh-head">
      <div className="gh-user">
        <span className="gh-ava">
          <Icon name="github" />
        </span>
        <div>
          <div className="u-name">{displayName}</div>
          <a className="u-handle" href={url} target="_blank" rel="noopener noreferrer">
            @{username}
          </a>
        </div>
      </div>
      <a className="btn btn-ghost btn-sm" href={url} target="_blank" rel="noopener noreferrer">
        <Icon name="github" /> {t.follow}
      </a>
    </div>
  );
}

function ExploreCard({ username, t }: GitHubSectionProps) {
  return (
    <div className="card gh-explore">
      <span className="gh-explore-ic">
        <Icon name="bolt" />
      </span>
      <p>{t.blurb}</p>
      <a className="link-arrow" href={`https://github.com/${username}`} target="_blank" rel="noopener noreferrer">
        {t.explore} <Icon name="arrowUpRight" />
      </a>
    </div>
  );
}

function GitHubFallback(props: GitHubSectionProps & { message: string }) {
  return (
    <div className="gh-grid">
      <div className="card gh-card">
        <UserHead {...props} />
        <p className="gh-unavailable" role="status">
          {props.message}
        </p>
      </div>
      <div className="gh-side">
        <ExploreCard {...props} />
      </div>
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

  return (
    <div className="gh-grid">
      <Reveal className="card gh-card">
        <UserHead {...props} />

        {overview.calendar ? (
          <>
            <ContributionHeatmap calendar={overview.calendar} locale={locale} t={t} />
            <p className="gh-caption">{fill(t.contributionsCaption, { count: overview.calendar.total })}</p>
          </>
        ) : (
          <p className="gh-unavailable">{t.calendarUnavailable}</p>
        )}

        {overview.repositories && overview.repositories.length > 0 && (
          <>
            <div className="hr" style={{ margin: '24px 0' }} />
            <div className="gh-repos">
              {overview.repositories.map((r) => (
                <a className="gh-repo" key={r.name} href={r.url} target="_blank" rel="noopener noreferrer">
                  <div className="r-name">
                    <Icon name="branch" style={{ width: 14, height: 14 }} /> {r.name}
                  </div>
                  {r.description && <div className="r-desc">{r.description}</div>}
                  <div className="r-meta">
                    {r.language && (
                      <span className="lang">
                        <span className="dot" style={{ background: LANGUAGE_COLORS[r.language] ?? 'var(--muted)' }} />{' '}
                        {r.language}
                      </span>
                    )}
                    {r.pushedAt && (
                      <span>
                        {t.updated} <RelativeTime iso={r.pushedAt} locale={intl} />
                      </span>
                    )}
                  </div>
                </a>
              ))}
            </div>
          </>
        )}

        {overview.activity && overview.activity.length > 0 && (
          <div className="gh-activity">
            <h3 className="gh-activity-title">{t.recentActivity}</h3>
            <ul>
              {overview.activity.map((a, i) => (
                <li className="gh-activity-item" key={`${a.createdAt}-${i}`}>
                  <span>
                    {describeActivity(a, t.events)}{' '}
                    <a href={a.repositoryUrl} target="_blank" rel="noopener noreferrer">
                      {a.repository}
                    </a>
                  </span>
                  <span className="time">
                    <RelativeTime iso={a.createdAt} locale={intl} />
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {overview.lastActivityAt && (
          <p className="gh-last-activity">
            {t.lastActivity}: <RelativeTime iso={overview.lastActivityAt} locale={intl} />
          </p>
        )}
      </Reveal>

      <Reveal delay={100} className="gh-side">
        {tiles.length > 0 && (
          <dl className="gh-stats">
            {tiles.map((s) => (
              <div className="gh-stat" key={s.label}>
                <dd className="gv">
                  <CountUp value={s.value} />
                </dd>
                <dt className="gk">{s.label}</dt>
              </div>
            ))}
          </dl>
        )}
        <ExploreCard {...props} />
      </Reveal>
    </div>
  );
}
