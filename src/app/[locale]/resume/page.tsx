import { PageShell } from '@/components/layout/PageShell';
import { JsonLd } from '@/components/ui/JsonLd';
import { getHighlights } from '@/features/profile/queries';
import { Resume } from '@/features/resume/components/Resume';
import { getPublishedResume } from '@/features/resume/queries';
import { getPageContent, getSection } from '@/features/site/queries';
import { getDictionary } from '@/i18n/get-dictionary';
import { resolveLocale, type LocaleParams } from '@/i18n/route-params';
import { topLevelPageMetadata } from '@/lib/seo/metadata';
import { buildPageNode } from '@/lib/seo/structured-data';

export async function generateMetadata({ params }: LocaleParams) {
  return topLevelPageMetadata('resume', await resolveLocale(params), '/resume');
}

export default async function ResumePage({ params }: LocaleParams) {
  const locale = await resolveLocale(params);
  const dict = getDictionary(locale);
  const [resume, highlights, section, content] = await Promise.all([
    getPublishedResume(),
    getHighlights(locale, 'resume'),
    getSection('resume', locale),
    getPageContent('resume', locale),
  ]);

  return (
    <PageShell page="resume" locale={locale}>
      <Resume section={section} resume={resume} highlights={highlights} t={dict.resume} />
      <JsonLd
        data={buildPageNode({
          type: 'WebPage',
          locale,
          path: '/resume',
          name: dict.nav.resume,
          description: content?.seoDescription,
        })}
      />
    </PageShell>
  );
}
