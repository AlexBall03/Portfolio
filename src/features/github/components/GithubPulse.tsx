import Link from 'next/link';
import { buttonStyles } from '@/components/ui/button-styles';
import { Icon } from '@/components/ui/Icon';
import { RelativeTime } from '@/components/ui/RelativeTime';
import { LOCALE_TAGS, type Locale } from '@/i18n/config';
import { fill, localizedPath } from '@/i18n/paths';
import { createLogger } from '@/lib/logger';
import { getGithubOverview } from '../overview';
import type { GithubOverview } from '../types';

const log = createLogger('github');

interface GithubPulseProps {
  username: string;
  locale: Locale;
  t: {
    title: string;
    repos: string;
    lastActivity: string;
    link: string;
    /** "{count} contributions in the last 6 months" and its singular. */
    contributions: string;
    contributionsOne: string;
  };
}

const CARD = 'glass flex flex-col gap-6 rounded-xl p-6';

/**
 * Home: a three-fact summary of public GitHub activity. Reads the same cached
 * overview as the Projects page's GitHub section (no extra requests), and
 * renders nothing when GitHub is unavailable, so it can never break the page.
 */
export async function GithubPulse({ username, locale, t }: GithubPulseProps) {
  let overview: GithubOverview | null = null;
  try {
    overview = await getGithubOverview(username);
  } catch (err) {
    log.error('GitHub overview failed', err);
  }
  const repos = overview?.stats?.repositories;
  const total = overview?.calendar?.total;
  const last = overview?.lastActivityAt;
  if (repos == null && total == null && !last) return null;
  const fmt = (n: number) => n.toLocaleString(LOCALE_TAGS[locale].intl);

  return (
    <aside aria-labelledby="pulse-title" className={CARD}>
      <h3 id="pulse-title" className="flex items-center gap-2.5 font-mono text-label tracking-[0.14em] text-fg uppercase">
        <Icon name="github" className="size-4" /> {t.title}
      </h3>
      {total != null && (
        <p className="flex flex-col gap-1.5">
          <span aria-hidden="true" className="font-display text-h1 leading-none text-fg tabular-nums">
            {fmt(total)}
          </span>
          <span className="text-body-sm text-fg-muted">
            {total === 1 ? t.contributionsOne : fill(t.contributions, { count: fmt(total) })}
          </span>
        </p>
      )}
      <dl className="grid grid-cols-2 gap-x-6 gap-y-5 border-t border-line pt-5">
        {repos != null && (
          <div className="flex flex-col gap-1">
            <dt className="font-mono text-micro tracking-[0.14em] text-fg-faint uppercase">{t.repos}</dt>
            <dd className="font-display text-h3 text-fg tabular-nums">{repos}</dd>
          </div>
        )}
        {last && (
          <div className="flex flex-col gap-1">
            <dt className="font-mono text-micro tracking-[0.14em] text-fg-faint uppercase">{t.lastActivity}</dt>
            <dd className="text-body-sm font-medium text-fg">
              <RelativeTime iso={last} locale={LOCALE_TAGS[locale].intl} />
            </dd>
          </div>
        )}
      </dl>
      <Link href={`${localizedPath(locale, '/projects')}#github`} className={buttonStyles({ variant: 'quiet', className: 'self-start' })}>
        {t.link} <Icon name="arrowRight" />
      </Link>
    </aside>
  );
}

/** Same footprint while the overview streams, so nothing shifts. */
export function GithubPulseSkeleton() {
  return (
    <div aria-hidden="true" className={`${CARD} min-h-56 motion-safe:animate-pulse`}>
      <span className="h-4 w-24 rounded-sm bg-fg/[0.06]" />
      <span className="h-10 w-32 rounded-sm bg-fg/[0.06]" />
      <span className="h-4 w-2/3 rounded-sm bg-fg/[0.05]" />
    </div>
  );
}
