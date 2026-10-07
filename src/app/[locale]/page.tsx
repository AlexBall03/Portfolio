import { PageShell } from '@/components/layout/PageShell';
import { JsonLd } from '@/components/ui/JsonLd';
import { Hero } from '@/features/profile/components/Hero';
import { getProfile } from '@/features/profile/queries';
import { getPageContent, getSiteSettings } from '@/features/site/queries';
import { getDictionary } from '@/i18n/get-dictionary';
import { resolveLocale, type LocaleParams } from '@/i18n/route-params';
import { topLevelPageMetadata } from '@/lib/seo/metadata';
import { buildPageNode } from '@/lib/seo/structured-data';

export async function generateMetadata({ params }: LocaleParams) {
  return topLevelPageMetadata('home', await resolveLocale(params), '/');
}

export default async function HomePage({ params }: LocaleParams) {
  const locale = await resolveLocale(params);
  const [profile, settings, content] = await Promise.all([
    getProfile(locale),
    getSiteSettings(),
    getPageContent('home', locale),
  ]);

  return (
    <PageShell page="home" locale={locale}>
      <Hero profile={profile} monogram={settings.monogram} locale={locale} t={getDictionary(locale).hero} />
      <JsonLd
        data={buildPageNode({
          type: 'WebPage',
          locale,
          path: '/',
          name: `${profile.fullName} — ${profile.title}`,
          description: content?.seoDescription,
          primaryImage: true,
        })}
      />
    </PageShell>
  );
}
