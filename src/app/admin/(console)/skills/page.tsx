import type { Metadata } from 'next';
import { loadTechnologies } from '@/features/projects/service';
import { SkillCategoriesEditor } from '@/features/skills/components/admin/SkillCategoriesEditor';
import { SkillsPageHeader } from '@/features/skills/components/admin/SkillsPageHeader';
import { loadSkillCategories } from '@/features/skills/service';
import { requireAdmin } from '@/server/auth/admin';

export const metadata: Metadata = { title: 'Skills' };

export default async function SkillsPage() {
  await requireAdmin();
  const [initial, technologies] = await Promise.all([loadSkillCategories(), loadTechnologies()]);
  return (
    <>
      <SkillsPageHeader current="categories" />
      <SkillCategoriesEditor initial={initial} technologies={technologies} />
    </>
  );
}
