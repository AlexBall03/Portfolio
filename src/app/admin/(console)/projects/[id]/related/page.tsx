import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { ProjectPageHeader } from '@/features/projects/components/admin/ProjectPageHeader';
import { RelatedProjectsEditor } from '@/features/projects/components/admin/RelatedProjectsEditor';
import { loadProject, loadProjectRelated } from '@/features/projects/service';
import { uuidParam } from '@/features/projects/upload';
import { requireAdmin } from '@/server/auth/admin';

export const metadata: Metadata = { title: 'Related projects' };

export default async function ProjectRelatedPage({ params }: { params: Promise<{ id: string }> }) {
  await requireAdmin();
  const { id } = await params;
  const valid = uuidParam.safeParse(id).success;
  const [project, related] = valid ? await Promise.all([loadProject(id), loadProjectRelated(id)]) : [null, null];
  if (!project || !related) notFound();
  return (
    <>
      <ProjectPageHeader
        project={{ id, name: project.name, slug: project.slug, status: project.status }}
        current="related"
      />
      <RelatedProjectsEditor projectId={id} initial={related.values} choices={related.choices} />
    </>
  );
}
