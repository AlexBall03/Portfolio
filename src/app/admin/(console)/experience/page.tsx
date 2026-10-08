import type { Metadata } from 'next';
import { AdminPageHeader } from '@/components/admin/AdminPageHeader';
import { ExperienceEditor } from '@/features/experience/components/admin/ExperienceEditor';
import { loadExperiences } from '@/features/experience/service';
import { requireAdmin } from '@/server/auth/admin';

export const metadata: Metadata = { title: 'Experience' };

export default async function ExperienceAdminPage() {
  await requireAdmin();
  const initial = await loadExperiences();
  return (
    <>
      <AdminPageHeader
        eyebrow="Content"
        title="Experience"
        lead="Career and education entries. The public page shows each list in the order set here; hidden entries stay here only."
      />
      <ExperienceEditor initial={initial} />
    </>
  );
}
