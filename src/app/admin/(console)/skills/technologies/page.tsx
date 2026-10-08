import type { Metadata } from 'next';
import { SkillsPageHeader } from '@/features/skills/components/admin/SkillsPageHeader';
import { TechnologiesEditor } from '@/features/skills/components/admin/TechnologiesEditor';
import { loadTechnologyValues } from '@/features/skills/service';
import { requireAdmin } from '@/server/auth/admin';

export const metadata: Metadata = { title: 'Technologies' };

export default async function TechnologiesPage() {
  await requireAdmin();
  const initial = await loadTechnologyValues();
  return (
    <>
      <SkillsPageHeader current="technologies" />
      <TechnologiesEditor initial={initial} />
    </>
  );
}
