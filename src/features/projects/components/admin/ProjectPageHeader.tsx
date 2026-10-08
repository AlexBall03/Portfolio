import Link from 'next/link';
import { AdminPageHeader } from '@/components/admin/AdminPageHeader';
import { SectionTabs } from '@/components/admin/SectionTabs';
import { Icon } from '@/components/ui/Icon';
import { buttonStyles } from '@/components/ui/button-styles';
import { ADMIN_PROJECTS_PATH, adminProjectPath } from '@/config/admin';
import type { ProjectStatus } from '../../types';
import { ProjectStatusPill, publicProjectPath } from './ProjectStatus';

interface ProjectPageHeaderProps {
  project: { id: string; name: string; slug: string; status: ProjectStatus };
  current: 'details' | 'case-study' | 'media' | 'milestones' | 'related';
}

/** Header for one project's editors: name, status, preview / live links, and the section tabs. */
export function ProjectPageHeader({ project, current }: ProjectPageHeaderProps) {
  const tabs = [
    { key: 'details', label: 'Details', href: adminProjectPath(project.id) },
    { key: 'case-study', label: 'Case study', href: adminProjectPath(project.id, 'case-study') },
    { key: 'media', label: 'Media', href: adminProjectPath(project.id, 'media') },
    { key: 'milestones', label: 'Milestones', href: adminProjectPath(project.id, 'milestones') },
    { key: 'related', label: 'Related', href: adminProjectPath(project.id, 'related') },
  ] as const;
  return (
    <>
      <Link href={ADMIN_PROJECTS_PATH} className={buttonStyles({ variant: 'quiet', className: 'self-start' })}>
        <Icon name="arrowLeft" /> All projects
      </Link>
      <AdminPageHeader
        eyebrow="Projects"
        title={project.name}
        lead={
          <span className="flex flex-wrap items-center gap-3">
            <ProjectStatusPill status={project.status} />
            <span className="font-mono text-micro text-fg-faint">{publicProjectPath(project.slug)}</span>
          </span>
        }
        actions={
          <>
            <Link href={adminProjectPath(project.id, 'preview')} className={buttonStyles({ variant: 'secondary', size: 'sm' })}>
              <Icon name="search" /> Preview
            </Link>
            {project.status === 'published' && (
              <a
                href={publicProjectPath(project.slug)}
                target="_blank"
                rel="noreferrer"
                className={buttonStyles({ variant: 'secondary', size: 'sm' })}
              >
                View live
                <Icon name="arrowUpRight" />
              </a>
            )}
          </>
        }
      />
      <SectionTabs label="Project sections" tabs={tabs} current={current} />
    </>
  );
}
