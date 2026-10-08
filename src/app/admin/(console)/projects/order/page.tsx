import type { Metadata } from 'next';
import Link from 'next/link';
import { AdminPageHeader } from '@/components/admin/AdminPageHeader';
import { Icon } from '@/components/ui/Icon';
import { buttonStyles } from '@/components/ui/button-styles';
import { ADMIN_PROJECTS_PATH } from '@/config/admin';
import { ProjectOrderEditor } from '@/features/projects/components/admin/ProjectOrderEditor';
import { loadProjectOrder } from '@/features/projects/service';
import { requireAdmin } from '@/server/auth/admin';

export const metadata: Metadata = { title: 'Project order' };

export default async function ProjectOrderPage() {
  await requireAdmin();
  const initial = await loadProjectOrder();
  return (
    <>
      <Link href={ADMIN_PROJECTS_PATH} className={buttonStyles({ variant: 'quiet', className: 'self-start' })}>
        <Icon name="arrowLeft" /> All projects
      </Link>
      <AdminPageHeader
        eyebrow="Projects"
        title="Order & featured"
        lead="Drag projects by their handle, or use the arrows. Nothing changes publicly until you save the order."
      />
      <ProjectOrderEditor initial={initial} />
    </>
  );
}
