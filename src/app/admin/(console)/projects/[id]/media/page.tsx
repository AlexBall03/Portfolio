import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { blobEnv } from '@/config/env';
import { ProjectMediaEditor } from '@/features/projects/components/admin/ProjectMediaEditor';
import { ProjectPageHeader } from '@/features/projects/components/admin/ProjectPageHeader';
import { loadProject, loadProjectMedia } from '@/features/projects/service';
import { uuidParam } from '@/features/projects/upload';
import { requireAdmin } from '@/server/auth/admin';

export const metadata: Metadata = { title: 'Project images' };

const storageConfigured = () => {
  try {
    blobEnv();
    return true;
  } catch {
    return false;
  }
};

export default async function ProjectMediaPage({ params }: { params: Promise<{ id: string }> }) {
  await requireAdmin();
  const { id } = await params;
  const valid = uuidParam.safeParse(id).success;
  const [project, media] = valid ? await Promise.all([loadProject(id), loadProjectMedia(id)]) : [null, null];
  if (!project || !media) notFound();
  return (
    <>
      <ProjectPageHeader
        project={{ id, name: project.translations.en.name, slug: project.slug, status: project.status }}
        current="media"
      />
      <ProjectMediaEditor projectId={id} initial={media} storageConfigured={storageConfigured()} />
    </>
  );
}
