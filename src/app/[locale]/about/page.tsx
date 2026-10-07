import { PageShell } from '@/components/layout/PageShell';
import { JsonLd } from '@/components/ui/JsonLd';
import { About } from '@/features/profile/components/About';
import { Snapshot } from '@/features/profile/components/Snapshot';
import { getHighlights, getProfile, getProfileRoles, getSnapshotMetrics } from '@/features/profile/queries';
import { getPageContent, getSection } from '@/features/site/queries';
import { Stack } from '@/features/skills/components/Stack';
import { getSkills } from '@/features/skills/queries';
import { getDictionary } from '@/i18n/get-dictionary';
import { resolveLocale, type LocaleParams } from '@/i18n/route-params';
import { topLevelPageMetadata } from '@/lib/seo/metadata';
import { buildPageNode } from '@/lib/seo/structured-data';

export async function generateMetadata({ params }: LocaleParams) {
  return topLevelPageMetadata('about', await resolveLocale(params), '/about');
}

export default async function AboutPage({ params }: LocaleParams) {
  const locale = await resolveLocale(params);
  const dict = getDictionary(locale);
  const [profile, metrics, roles, differentiators, skills, snapshotSection, aboutSection, stackSection, content] =
    await Promise.all([
      getProfile(locale),
      getSnapshotMetrics(locale),
      getProfileRoles(locale),
      getHighlights(locale, 'differentiator'),
      getSkills(locale),
      getSection('snapshot', locale),
      getSection('about', locale),
      getSection('stack', locale),
      getPageContent('about', locale),
    ]);

  return (
    <PageShell page="about" locale={locale}>
      <Snapshot section={snapshotSection} metrics={metrics} />
      <About section={aboutSection} profile={profile} roles={roles} differentiators={differentiators} t={dict.about} />
      <Stack section={stackSection} skills={skills} t={dict.stack} />
      <JsonLd
        data={buildPageNode({
          type: 'ProfilePage',
          locale,
          path: '/about',
          name: dict.nav.about,
          description: content?.seoDescription,
        })}
      />
    </PageShell>
  );
}
