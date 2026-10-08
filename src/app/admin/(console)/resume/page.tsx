import type { Metadata } from 'next';
import { AdminPageHeader } from '@/components/admin/AdminPageHeader';
import { ResumeManager } from '@/features/resume/components/admin/ResumeManager';
import { loadResumeAdmin } from '@/features/resume/service';
import { requireAdmin } from '@/server/auth/admin';

export const metadata: Metadata = { title: 'Resume' };

export default async function ResumeAdminPage() {
  await requireAdmin();
  const initial = await loadResumeAdmin();
  return (
    <>
      <AdminPageHeader
        eyebrow="Content"
        title="Resume"
        lead="Upload resume PDFs and choose which one is public. Every version is stored privately; only the published one is served on the site, in both languages. Resume highlights live in Profile; the page heading in Page content."
      />
      <ResumeManager initial={initial} />
    </>
  );
}
