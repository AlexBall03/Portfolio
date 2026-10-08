import type { Metadata } from 'next';
import Link from 'next/link';
import { AdminPageHeader } from '@/components/admin/AdminPageHeader';
import { buttonStyles } from '@/components/ui/button-styles';
import { ADMIN_PROJECTS_PATH } from '@/config/admin';
import { ProjectList } from '@/features/projects/components/admin/ProjectList';
import { loadProjectList } from '@/features/projects/service';
import { requireAdmin } from '@/server/auth/admin';

export const metadata: Metadata = { title: 'Projects' };

export default async function ProjectsPage() {
  await requireAdmin();
  const projects = await loadProjectList();
  return (
    <>
      <AdminPageHeader
        eyebrow="Content"
        title="Projects"
        lead="Drafts stay private until published. Edits to a published project go live when saved."
        actions={
          <>
            <Link href={`${ADMIN_PROJECTS_PATH}/order`} className={buttonStyles({ variant: 'secondary', size: 'sm' })}>
              Order &amp; featured
            </Link>
            <Link href={`${ADMIN_PROJECTS_PATH}/new`} className={buttonStyles({ size: 'sm' })}>
              New project
            </Link>
          </>
        }
      />
      <ProjectList projects={projects} />
    </>
  );
}
