import { PageShell } from '@/components/layout/PageShell';
import { JsonLd } from '@/components/ui/JsonLd';
import { ContactSection } from '@/features/contact/components/ContactSection';
import { getProfile, getSocialLinks } from '@/features/profile/queries';
import { getPageContent, getSection } from '@/features/site/queries';
import { getDictionary } from '@/i18n/get-dictionary';
import { resolveLocale, type LocaleParams } from '@/i18n/route-params';
import { topLevelPageMetadata } from '@/lib/seo/metadata';
import { buildPageNode } from '@/lib/seo/structured-data';

export async function generateMetadata({ params }: LocaleParams) {
  return topLevelPageMetadata('contact', await resolveLocale(params), '/contact');
}

export default async function ContactPage({ params }: LocaleParams) {
  const locale = await resolveLocale(params);
  const dict = getDictionary(locale);
  const [profile, socials, section, content] = await Promise.all([
    getProfile(locale),
    getSocialLinks(),
    getSection('contact', locale),
    getPageContent('contact', locale),
  ]);

  return (
    <PageShell page="contact" locale={locale}>
      <ContactSection section={section} email={profile.email} socials={socials} t={dict.contact} />
      <JsonLd
        data={buildPageNode({
          type: 'ContactPage',
          locale,
          path: '/contact',
          name: dict.nav.contact,
          description: content?.seoDescription,
        })}
      />
    </PageShell>
  );
}
