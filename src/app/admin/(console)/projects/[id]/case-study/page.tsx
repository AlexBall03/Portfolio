import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { CaseStudyEditor } from '@/features/projects/components/admin/CaseStudyEditor';
import { ProjectPageHeader } from '@/features/projects/components/admin/ProjectPageHeader';
import { loadProject, loadProjectCaseStudy } from '@/features/projects/service';
import { uuidParam } from '@/features/projects/upload';
import { requireAdmin } from '@/server/auth/admin';

export const metadata: Metadata = { title: 'Project case study' };

export default async function ProjectCaseStudyPage({ params }: { params: Promise<{ id: string }> }) {
  await requireAdmin();
  const { id } = await params;
  const valid = uuidParam.safeParse(id).success;
  const [project, caseStudy] = valid ? await Promise.all([loadProject(id), loadProjectCaseStudy(id)]) : [null, null];
  if (!project || !caseStudy) notFound();
  return (
    <>
      <ProjectPageHeader
        project={{ id, name: project.translations.en.name, slug: project.slug, status: project.status }}
        current="case-study"
      />
      <CaseStudyEditor projectId={id} initial={caseStudy.values} images={caseStudy.images} published={project.status === 'published'} />
    </>
  );
}
