import { PageShell } from '@/components/layout/PageShell';
import { JsonLd } from '@/components/ui/JsonLd';
import { Resume } from '@/features/profile/components/Resume';
import { getHighlights, getProfile } from '@/features/profile/queries';
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
  const [profile, highlights, section, content] = await Promise.all([
    getProfile(locale),
    getHighlights(locale, 'resume'),
    getSection('resume', locale),
    getPageContent('resume', locale),
  ]);

  return (
    <PageShell page="resume" locale={locale}>
      <Resume section={section} profile={profile} highlights={highlights} t={dict.resume} />
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
