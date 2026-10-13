import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { Suspense } from 'react';
import { PageShell } from '@/components/layout/PageShell';
import { JsonLd } from '@/components/ui/JsonLd';
import { SUPPORT_PATH } from '@/config/navigation';
import { Support, SupportSponsors } from '@/features/sponsorship/components/Support';
import { getSponsorshipSettings } from '@/features/sponsorship/queries';
import { sponsorshipVisibility } from '@/features/sponsorship/sponsors';
import { resolvePageSeo, topLevelPageMetadata } from '@/lib/seo/metadata';
import { buildPageNode } from '@/lib/seo/structured-data';

export async function generateMetadata(): Promise<Metadata> {
  const settings = await getSponsorshipSettings();
  // Switched off: the page below is a 404, which sets its own metadata.
  if (!sponsorshipVisibility(settings).supportPage) return {};
  return topLevelPageMetadata('support', SUPPORT_PATH);
}

/**
 * Support: what sponsorship is for, the GitHub Sponsors button, and the public
 * sponsors. Available only while sponsorship and this page are switched on
 * (Admin → Sponsorship); otherwise it is the site's 404. The sponsors stream in
 * their own boundary, so the page and its button never wait on GitHub.
 */
export default async function SupportPage() {
  const [settings, seo] = await Promise.all([getSponsorshipSettings(), resolvePageSeo('support')]);
  const visibility = sponsorshipVisibility(settings);
  if (!visibility.supportPage) notFound();

  return (
    <PageShell page="support">
      <Support
        settings={settings}
        sponsors={
          visibility.sponsors && (
            <Suspense fallback={null}>
              <SupportSponsors settings={settings} />
            </Suspense>
          )
        }
      />
      <JsonLd
        data={buildPageNode({
          type: 'WebPage',
          path: SUPPORT_PATH,
          name: seo.title,
          description: seo.description,
        })}
      />
    </PageShell>
  );
}
