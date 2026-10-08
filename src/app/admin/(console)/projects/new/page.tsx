import type { Metadata } from 'next';
import Link from 'next/link';
import { AdminPageHeader } from '@/components/admin/AdminPageHeader';
import { Icon } from '@/components/ui/Icon';
import { buttonStyles } from '@/components/ui/button-styles';
import { ADMIN_PROJECTS_PATH } from '@/config/admin';
import { ProjectEditor } from '@/features/projects/components/admin/ProjectEditor';
import { blankProject, loadTechnologies } from '@/features/projects/service';
import { requireAdmin } from '@/server/auth/admin';

export const metadata: Metadata = { title: 'New project' };

export default async function NewProjectPage() {
  await requireAdmin();
  const technologies = await loadTechnologies();
  return (
    <>
      <Link href={ADMIN_PROJECTS_PATH} className={buttonStyles({ variant: 'quiet', className: 'self-start' })}>
        <Icon name="arrowLeft" /> All projects
      </Link>
      <AdminPageHeader
        eyebrow="Projects"
        title="New project"
        lead="It starts as a draft and stays private until you publish it. Images are added after the first save."
      />
      <ProjectEditor initial={blankProject()} technologies={technologies} />
    </>
  );
}
