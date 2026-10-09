import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { ProjectPageHeader } from '@/features/projects/components/admin/ProjectPageHeader';
import { RepositoriesEditor } from '@/features/projects/components/admin/RepositoriesEditor';
import { loadProject, loadProjectRepositories } from '@/features/projects/service';
import { uuidParam } from '@/features/projects/upload';
import { requireAdmin } from '@/server/auth/admin';

export const metadata: Metadata = { title: 'GitHub' };

export default async function ProjectGithubPage({ params }: { params: Promise<{ id: string }> }) {
  await requireAdmin();
  const { id } = await params;
  const valid = uuidParam.safeParse(id).success;
  const [project, repositories] = valid ? await Promise.all([loadProject(id), loadProjectRepositories(id)]) : [null, null];
  if (!project || !repositories) notFound();
  return (
    <>
      <ProjectPageHeader
        project={{ id, name: project.translations.en.name, slug: project.slug, status: project.status }}
        current="github"
      />
      <RepositoriesEditor projectId={id} initial={repositories} />
    </>
  );
}
