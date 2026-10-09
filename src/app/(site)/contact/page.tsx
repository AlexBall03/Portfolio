import { PageShell } from '@/components/layout/PageShell';
import { JsonLd } from '@/components/ui/JsonLd';
import { ContactSection } from '@/features/contact/components/ContactSection';
import { getProfile, getSocialLinks } from '@/features/profile/queries';
import { getSection } from '@/features/site/queries';
import { resolvePageSeo, topLevelPageMetadata } from '@/lib/seo/metadata';
import { buildPageNode } from '@/lib/seo/structured-data';

export async function generateMetadata() {
  return topLevelPageMetadata('contact', '/contact');
}

export default async function ContactPage() {
  const [profile, socials, section, content] = await Promise.all([
    getProfile(),
    getSocialLinks(),
    getSection('contact'),
    resolvePageSeo('contact'),
  ]);

  return (
    <PageShell page="contact">
      <ContactSection section={section} email={profile.email} socials={socials} />
      <JsonLd
        data={buildPageNode({
          type: 'ContactPage',
          path: '/contact',
          name: content.title,
          description: content.description,
        })}
      />
    </PageShell>
  );
}
