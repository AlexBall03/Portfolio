import { PageShell } from '@/components/layout/PageShell';
import { JsonLd } from '@/components/ui/JsonLd';
import { Experience } from '@/features/experience/components/Experience';
import { getExperiences } from '@/features/experience/queries';
import { getSection } from '@/features/site/queries';
import { resolvePageSeo, topLevelPageMetadata } from '@/lib/seo/metadata';
import { buildPageNode } from '@/lib/seo/structured-data';

export async function generateMetadata() {
  return topLevelPageMetadata('experience', '/experience');
}

export default async function ExperiencePage() {
  const [items, section, content] = await Promise.all([
    getExperiences(),
    getSection('experience'),
    resolvePageSeo('experience'),
  ]);

  return (
    <PageShell page="experience">
      <Experience section={section} items={items} />
      <JsonLd
        data={buildPageNode({
          type: 'WebPage',
          path: '/experience',
          name: content.title,
          description: content.description,
        })}
      />
    </PageShell>
  );
}
