import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { MilestoneEditor } from '@/features/projects/components/admin/MilestoneEditor';
import { ProjectPageHeader } from '@/features/projects/components/admin/ProjectPageHeader';
import { loadProject, loadProjectMilestones } from '@/features/projects/service';
import { uuidParam } from '@/features/projects/upload';
import { requireAdmin } from '@/server/auth/admin';

export const metadata: Metadata = { title: 'Project milestones' };

export default async function ProjectMilestonesPage({ params }: { params: Promise<{ id: string }> }) {
  await requireAdmin();
  const { id } = await params;
  const valid = uuidParam.safeParse(id).success;
  const [project, milestones] = valid ? await Promise.all([loadProject(id), loadProjectMilestones(id)]) : [null, null];
  if (!project || !milestones) notFound();
  return (
    <>
      <ProjectPageHeader
        project={{ id, name: project.name, slug: project.slug, status: project.status }}
        current="milestones"
      />
      <MilestoneEditor projectId={id} initial={milestones.values} images={milestones.images} published={project.status === 'published'} />
    </>
  );
}
