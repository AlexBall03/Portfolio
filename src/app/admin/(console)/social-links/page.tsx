import type { Metadata } from 'next';
import { AdminPageHeader } from '@/components/admin/AdminPageHeader';
import { SocialLinksEditor } from '@/features/profile/components/admin/SocialLinksEditor';
import { loadSocialLinks } from '@/features/profile/service';
import { requireAdmin } from '@/server/auth/admin';

export const metadata: Metadata = { title: 'Social links' };

export default async function SocialLinksPage() {
  await requireAdmin();
  const initial = await loadSocialLinks();
  return (
    <>
      <AdminPageHeader
        eyebrow="Site"
        title="Social links"
        lead="Your public profiles. Only http(s) links are accepted; icons come from the platform."
      />
      <SocialLinksEditor initial={initial} />
    </>
  );
}
