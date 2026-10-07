import { PageShell } from '@/components/layout/PageShell';
import { JsonLd } from '@/components/ui/JsonLd';
import { Experience } from '@/features/experience/components/Experience';
import { getExperiences } from '@/features/experience/queries';
import { getPageContent, getSection } from '@/features/site/queries';
import { getDictionary } from '@/i18n/get-dictionary';
import { resolveLocale, type LocaleParams } from '@/i18n/route-params';
import { topLevelPageMetadata } from '@/lib/seo/metadata';
import { buildPageNode } from '@/lib/seo/structured-data';

export async function generateMetadata({ params }: LocaleParams) {
  return topLevelPageMetadata('experience', await resolveLocale(params), '/experience');
}

export default async function ExperiencePage({ params }: LocaleParams) {
  const locale = await resolveLocale(params);
  const dict = getDictionary(locale);
  const [items, section, content] = await Promise.all([
    getExperiences(locale),
    getSection('experience', locale),
    getPageContent('experience', locale),
  ]);

  return (
    <PageShell page="experience" locale={locale}>
      <Experience section={section} items={items} locale={locale} t={dict.experience} />
      <JsonLd
        data={buildPageNode({
          type: 'WebPage',
          locale,
          path: '/experience',
          name: dict.nav.experience,
          description: content?.seoDescription,
        })}
      />
    </PageShell>
  );
}
