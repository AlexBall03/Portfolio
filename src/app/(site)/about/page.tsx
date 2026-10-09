import { PageShell } from '@/components/layout/PageShell';
import { JsonLd } from '@/components/ui/JsonLd';
import { About } from '@/features/profile/components/About';
import { Snapshot } from '@/features/profile/components/Snapshot';
import { getHighlights, getProfile, getProfileRoles, getSnapshotMetrics } from '@/features/profile/queries';
import { getProjects } from '@/features/projects/queries';
import { usageCounts } from '@/features/projects/technologies';
import { getSection } from '@/features/site/queries';
import { Stack } from '@/features/skills/components/Stack';
import { getSkills } from '@/features/skills/queries';
import { resolvePageSeo, topLevelPageMetadata } from '@/lib/seo/metadata';
import { buildPageNode } from '@/lib/seo/structured-data';

export async function generateMetadata() {
  return topLevelPageMetadata('about', '/about');
}

export default async function AboutPage() {
  const [profile, metrics, roles, differentiators, skills, projects, snapshotSection, aboutSection, stackSection, content] =
    await Promise.all([
      getProfile(),
      getSnapshotMetrics(),
      getProfileRoles(),
      getHighlights('differentiator'),
      getSkills(),
      getProjects(),
      getSection('snapshot'),
      getSection('about'),
      getSection('stack'),
      resolvePageSeo('about'),
    ]);

  return (
    <PageShell page="about">
      <Snapshot section={snapshotSection} metrics={metrics} />
      <About section={aboutSection} profile={profile} roles={roles} differentiators={differentiators} />
      <Stack section={stackSection} skills={skills} usage={usageCounts(projects)} />
      <JsonLd
        data={buildPageNode({
          type: 'ProfilePage',
          path: '/about',
          name: content.title,
          description: content.description,
        })}
      />
    </PageShell>
  );
}
