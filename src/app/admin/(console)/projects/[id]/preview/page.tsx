import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Icon } from '@/components/ui/Icon';
import { buttonStyles } from '@/components/ui/button-styles';
import { adminProjectPath } from '@/config/admin';
import { copy } from '@/config/copy';
import { ProjectStatusPill } from '@/features/projects/components/admin/ProjectStatus';
import { ProjectGithubSection } from '@/features/github/components/ProjectGithubSection';
import { ProjectDetail } from '@/features/projects/components/ProjectDetail';
import { pickRelated } from '@/features/projects/case-study';
import { loadProject, loadProjectPreview, loadPublishedProjects } from '@/features/projects/service';
import { uuidParam } from '@/features/projects/upload';
import { requireAdmin } from '@/server/auth/admin';

export const metadata: Metadata = { title: 'Project preview' };

interface PreviewProps {
  params: Promise<{ id: string }>;
}

/**
 * The project exactly as its public page renders it (same component, same
 * read model), whatever its status. Only the admin can reach it.
 */
export default async function ProjectPreviewPage({ params }: PreviewProps) {
  await requireAdmin();
  const { id } = await params;
  const valid = uuidParam.safeParse(id).success;
  const [values, project, published] = valid
    ? await Promise.all([loadProject(id), loadProjectPreview(id), loadPublishedProjects()])
    : [null, null, []];
  if (!values || !project) notFound();
  const githubHidden = project.repositories.length > 0 && !project.githubAnalytics;
  const hiddenCount = [...project.sections, ...project.milestones].filter((x) => x.hidden).length + (githubHidden ? 1 : 0);

  return (
    <>
      <div className="glass-strong flex flex-col gap-3 rounded-lg px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-3 text-body-sm text-fg-muted">
          <ProjectStatusPill status={values.status} />
          {values.status === 'published' ? 'Preview of the live project page.' : 'Preview · not on the public site.'}
          {hiddenCount > 0 && ` ${hiddenCount} hidden ${hiddenCount === 1 ? 'item is' : 'items are'} shown, marked Hidden.`}
        </div>
        <Link href={adminProjectPath(id)} className={buttonStyles({ variant: 'secondary', size: 'sm' })}>
          <Icon name="arrowLeft" /> Back to editor
        </Link>
      </div>
      <div className="overflow-hidden rounded-xl border border-line pb-14">
        <ProjectDetail
          project={project}
          related={pickRelated(project.id, project.relatedIds, published)}
          github={
            project.repositories.length > 0
              ? {
                  heading: copy.projectGithub.heading,
                  lead: copy.projectGithub.lead,
                  hidden: githubHidden,
                  content: <ProjectGithubSection repositories={project.repositories} />,
                }
              : null
          }
        />
      </div>
    </>
  );
}
