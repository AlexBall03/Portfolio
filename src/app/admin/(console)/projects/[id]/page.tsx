import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { ProjectEditor } from '@/features/projects/components/admin/ProjectEditor';
import { ProjectPageHeader } from '@/features/projects/components/admin/ProjectPageHeader';
import { loadProject, loadTechnologies } from '@/features/projects/service';
import { uuidParam } from '@/features/projects/upload';
import { requireAdmin } from '@/server/auth/admin';

export const metadata: Metadata = { title: 'Edit project' };

export default async function ProjectDetailsPage({ params }: { params: Promise<{ id: string }> }) {
  await requireAdmin();
  const { id } = await params;
  const project = uuidParam.safeParse(id).success ? await loadProject(id) : null;
  if (!project) notFound();
  const technologies = await loadTechnologies();
  return (
    <>
      <ProjectPageHeader
        project={{ id, name: project.translations.en.name, slug: project.slug, status: project.status }}
        current="details"
      />
      <ProjectEditor initial={project} technologies={technologies} />
    </>
  );
}
