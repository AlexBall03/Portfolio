import type { Metadata } from 'next';
import Link from 'next/link';
import type { ReactNode } from 'react';
import { AdminPageHeader } from '@/components/admin/AdminPageHeader';
import { RelativeTime } from '@/components/ui/RelativeTime';
import { Status, type StatusTone } from '@/components/ui/Status';
import { ADMIN_CONTENT_PATH } from '@/config/admin';
import { SUPPORT_PATH } from '@/config/navigation';
import { SponsorRefresh } from '@/features/sponsorship/components/admin/SponsorRefresh';
import { SponsorshipEditor } from '@/features/sponsorship/components/admin/SponsorshipEditor';
import { loadSponsorshipSettings } from '@/features/sponsorship/service';
import { loadPublicSponsors } from '@/features/sponsorship/sponsor-data';
import { sponsorLogin, sponsorshipVisibility, visibleSponsors } from '@/features/sponsorship/sponsors';
import type { SponsorsResult } from '@/features/sponsorship/types';
import { requireAdmin } from '@/server/auth/admin';

export const metadata: Metadata = { title: 'Sponsorship' };

const link = (href: string, label: string) => (
  <Link href={href} className="text-brand-fg underline-offset-4 hover:underline">
    {label}
  </Link>
);

const REASONS: Record<string, string> = {
  'rate-limited': 'GitHub is rate limiting requests',
  'not-found': 'GitHub has no such account',
  'invalid-response': 'GitHub sent an unexpected response',
  upstream: 'GitHub could not be reached',
};

/** What the last read of GitHub's sponsor data says, in words. Never a credential or sponsor detail. */
function describe(result: SponsorsResult | null): { tone: StatusTone; label: string; detail?: string } {
  if (!result) return { tone: 'accent', label: 'Not configured', detail: 'The GitHub Sponsors URL isn’t valid.' };
  switch (result.status) {
    case 'ok':
      return { tone: 'success', label: 'Connected' };
    case 'unconfigured':
      return { tone: 'neutral', label: 'Not configured', detail: 'No GitHub token is set (GITHUB_TOKEN).' };
    case 'unauthorized':
      return { tone: 'accent', label: 'Access refused', detail: 'GitHub rejected the token, or it may not read sponsorships.' };
    case 'unavailable':
      return { tone: 'accent', label: 'Unavailable', detail: `${REASONS[result.reason] ?? REASONS.upstream}. It is retried within a minute.` };
  }
}

export default async function SponsorshipPage() {
  await requireAdmin();
  const initial = await loadSponsorshipSettings();
  const login = sponsorLogin(initial.sponsorsUrl);
  // The same cached read the public site uses, so this is what visitors get.
  const result = login ? await loadPublicSponsors(login) : null;
  const sponsors = result?.status === 'ok' ? result.sponsors : null;
  const visibility = sponsorshipVisibility(initial);
  const github = describe(result);
  const shown = sponsors ? visibleSponsors(sponsors, initial.hiddenSponsors).length : null;

  const parts = [visibility.home && 'home section', visibility.supportPage && 'support page', visibility.sponsors && 'sponsor lists'].filter(Boolean);
  const facts: { label: string; value: ReactNode }[] = [
    {
      label: 'Sponsorship',
      value: (
        <>
          <Status tone={initial.enabled ? 'success' : 'neutral'}>{initial.enabled ? 'On' : 'Off'}</Status>
          {initial.enabled && <span className="ml-3 text-fg-muted">{parts.length ? parts.join(' · ') : 'nothing is switched on'}</span>}
        </>
      ),
    },
    {
      label: 'GitHub data',
      value: (
        <>
          <Status tone={github.tone}>{github.label}</Status>
          {github.detail && <span className="mt-1.5 block text-fg-muted">{github.detail}</span>}
        </>
      ),
    },
    ...(result?.status === 'ok'
      ? [
          { label: 'Last retrieved', value: <RelativeTime iso={result.fetchedAt} /> },
          {
            label: 'Public sponsors',
            value: (
              <>
                {result.sponsors.length} on GitHub · {shown} shown · {result.sponsors.length - (shown ?? 0)} hidden here
              </>
            ),
          },
        ]
      : []),
    { label: 'Search and sharing', value: link(`${ADMIN_CONTENT_PATH}/support`, 'Edit in Page content') },
    ...(visibility.supportPage ? [{ label: 'Public page', value: link(SUPPORT_PATH, SUPPORT_PATH) }] : []),
  ];

  return (
    <>
      <AdminPageHeader
        eyebrow="Site"
        title="Sponsorship"
        lead="GitHub Sponsors on the site: the home section, the support page, and which public sponsors are recognized. GitHub handles the sponsorships themselves."
        actions={<SponsorRefresh />}
      />
      <dl className="grid grid-cols-[minmax(8rem,auto)_1fr] gap-x-6 border-b border-line text-body-sm">
        {facts.map((f) => (
          <div key={f.label} className="col-span-2 grid grid-cols-subgrid border-t border-line py-2.5">
            <dt className="text-fg-muted">{f.label}</dt>
            <dd className="min-w-0 break-words text-fg">{f.value}</dd>
          </div>
        ))}
      </dl>
      <SponsorshipEditor initial={initial} sponsors={sponsors} />
    </>
  );
}
