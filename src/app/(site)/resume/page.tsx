import { PageShell } from '@/components/layout/PageShell';
import { JsonLd } from '@/components/ui/JsonLd';
import { getHighlights } from '@/features/profile/queries';
import { Resume } from '@/features/resume/components/Resume';
import { getPublishedResume } from '@/features/resume/queries';
import { getSection } from '@/features/site/queries';
import { resolvePageSeo, topLevelPageMetadata } from '@/lib/seo/metadata';
import { buildPageNode } from '@/lib/seo/structured-data';

export async function generateMetadata() {
  return topLevelPageMetadata('resume', '/resume');
}

export default async function ResumePage() {
  const [resume, highlights, section, content] = await Promise.all([
    getPublishedResume(),
    getHighlights('resume'),
    getSection('resume'),
    resolvePageSeo('resume'),
  ]);

  return (
    <PageShell page="resume">
      <Resume section={section} resume={resume} highlights={highlights} />
      <JsonLd
        data={buildPageNode({
          type: 'WebPage',
          path: '/resume',
          name: content.title,
          description: content.description,
        })}
      />
    </PageShell>
  );
}
