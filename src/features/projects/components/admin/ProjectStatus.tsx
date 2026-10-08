import { Status, type StatusTone } from '@/components/ui/Status';
import type { ProjectStatus } from '../../types';

const STATUS: Record<ProjectStatus, { label: string; tone: StatusTone }> = {
  published: { label: 'Published', tone: 'success' },
  draft: { label: 'Draft', tone: 'neutral' },
  archived: { label: 'Archived', tone: 'accent' },
};

/** Draft / Published (legacy archived rows read as Archived). */
export function ProjectStatusPill({ status }: { status: ProjectStatus }) {
  return <Status tone={STATUS[status].tone}>{STATUS[status].label}</Status>;
}

/** The public URL of a project (English, unprefixed). */
export const publicProjectPath = (slug: string) => `/projects/${slug}`;
