import { useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import { useGithubProfile } from '../../services/github';
import Reveal from '../../ui/Reveal';
import Icon from '../../ui/Icon';
import SectionHead from '../../ui/SectionHead';
import useCountUp from '../../hooks/useCountUp';

const LANGUAGE_COLORS = {
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

function languageColor(lang) {
  return LANGUAGE_COLORS[lang] || 'var(--muted)';
}

function bucketLevel(count) {
  if (count <= 0) return 0;
  if (count <= 2) return 1;
  if (count <= 4) return 2;
  if (count <= 7) return 3;
  return 4;
}

const RELATIVE_UNITS = [
  ['year', 31536000],
  ['month', 2592000],
  ['week', 604800],
  ['day', 86400],
  ['hour', 3600],
  ['minute', 60],
];

function formatRelativeTime(iso, locale) {
  if (!iso) return '';
  const diffSec = (Date.now() - new Date(iso).getTime()) / 1000;
  const rtf = new Intl.RelativeTimeFormat(locale, { numeric: 'auto' });
  for (const [unit, secs] of RELATIVE_UNITS) {
    if (diffSec >= secs) return rtf.format(-Math.round(diffSec / secs), unit);
  }
  return rtf.format(0, 'minute');
}

export default function GitHub() {
  const { data, strings, locale } = useApp();
  const T = strings.github;
  const { data: gh, loading, error } = useGithubProfile();

  const cells = useMemo(() => {
    if (!gh?.contributionCalendar?.weeks) return null;
    return gh.contributionCalendar.weeks.flatMap((w) => w.days.map((d) => bucketLevel(d.count)));
  }, [gh]);

  const [reposRef, reposDisplay] = useCountUp(gh?.profile?.publicRepos || 0);
  const [starsRef, starsDisplay] = useCountUp(gh?.stats?.totalStars || 0);
  const [forksRef, forksDisplay] = useCountUp(gh?.stats?.totalForks || 0);
  const [followersRef, followersDisplay] = useCountUp(gh?.profile?.followers || 0);

  const statTiles = [
    { ref: reposRef, display: reposDisplay, label: T.statPublicRepos },
    { ref: starsRef, display: starsDisplay, label: T.statStars },
    { ref: forksRef, display: forksDisplay, label: T.statForks },
    { ref: followersRef, display: followersDisplay, label: T.statFollowers },
  ];

  const repos = gh?.repositories?.slice(0, 4) || [];
  const activity = gh?.recentActivity?.slice(0, 3) || [];

  return (
    <section id="github" className="band">
      <div className="wrap">
        <SectionHead idx="05" label="GitHub Activity" title={T.title} sub={T.sub} />
        <div className="gh-grid">
          <Reveal className="card gh-card">
            <div className="gh-head">
              <div className="gh-user">
                <span className="gh-ava"><Icon name="github" /></span>
                <div>
                  <div className="u-name">{data.identity.name}</div>
                  <a className="u-handle" href={data.identity.github} target="_blank" rel="noreferrer">
                    @{data.identity.githubHandle}
                  </a>
                </div>
              </div>
              <a className="btn btn-ghost btn-sm" href={data.identity.github} target="_blank" rel="noreferrer">
                <Icon name="github" /> {T.follow}
              </a>
            </div>

            {error ? (
              <p className="gh-unavailable">{T.unavailable}</p>
            ) : (
              <>
                {cells ? (
                  <>
                    <div className="gh-contrib">
                      {cells.map((l, i) => <span key={i} className={`gh-cell ${l ? 'l' + l : ''}`} />)}
                    </div>
                    <div className="gh-legend">
                      <span>{T.less}</span>
                      <span className="lg gh-cell" /><span className="lg gh-cell l1" />
                      <span className="lg gh-cell l2" /><span className="lg gh-cell l3" /><span className="lg gh-cell l4" />
                      <span>{T.more}</span>
                    </div>
                    {gh?.stats?.totalContributions != null && (
                      <p className="gh-caption">{gh.stats.totalContributions} {T.contributionsCaption}</p>
                    )}
                  </>
                ) : (
                  <p className="gh-unavailable">{loading ? T.loading : T.activityUnavailable}</p>
                )}

                <div className="hr" style={{ margin: '24px 0' }} />
                <div className="gh-repos">
                  {repos.map((r) => (
                    <a className="gh-repo" key={r.name} href={r.url} target="_blank" rel="noreferrer">
                      <div className="r-name"><Icon name="branch" style={{ width: 14, height: 14 }} /> {r.name}</div>
                      {r.description && <div className="r-desc">{r.description}</div>}
                      <div className="r-meta">
                        {r.language && (
                          <span className="lang"><span className="dot" style={{ background: languageColor(r.language) }} /> {r.language}</span>
                        )}
                        <span>{T.updatedPrefix} {formatRelativeTime(r.pushedAt, locale)}</span>
                      </div>
                    </a>
                  ))}
                </div>

                {activity.length > 0 && (
                  <div className="gh-activity">
                    <div className="gh-activity-title">{T.recentActivityTitle}</div>
                    {activity.map((a, i) => (
                      <div className="gh-activity-item" key={i}>
                        <span>
                          {a.description} {a.repositoryUrl && (
                            <a href={a.repositoryUrl} target="_blank" rel="noreferrer">{a.repository}</a>
                          )}
                        </span>
                        <span className="time">{formatRelativeTime(a.createdAt, locale)}</span>
                      </div>
                    ))}
                  </div>
                )}

                {gh?.lastActivityAt && (
                  <p className="gh-last-activity">{T.lastActivity}: {formatRelativeTime(gh.lastActivityAt, locale)}</p>
                )}
              </>
            )}
          </Reveal>

          <Reveal delay={100} style={{ display: 'flex', flexDirection: 'column', gap: 22 }}>
            {!error && (
              <div className="gh-stats">
                {statTiles.map((s) => (
                  <div className="gh-stat" key={s.label}>
                    <div className="gv" ref={s.ref}>{s.display}</div>
                    <div className="gk">{s.label}</div>
                  </div>
                ))}
              </div>
            )}
            <div className="card" style={{ padding: 24, flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 14 }}>
              <span style={{ width: 40, height: 40, borderRadius: 11, display: 'grid', placeItems: 'center', background: 'rgba(45,127,249,0.1)', border: '1px solid rgba(45,127,249,0.2)', color: 'var(--accent-300)' }}>
                <Icon name="bolt" />
              </span>
              <p style={{ color: 'var(--text)', fontSize: '0.96rem' }}>{T.blurb}</p>
              <a className="link-arrow" href={data.identity.github} target="_blank" rel="noreferrer">
                {T.explore} <Icon name="arrowUpRight" />
              </a>
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
