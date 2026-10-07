import type { SkillsOverview } from '@/features/skills/types';
import type { SnapshotMetric } from './types';

/** Counts the derived snapshot metrics are computed from. */
export interface MetricCounts {
  publishedProjects: number;
  technologies: number;
}

/** Distinct technologies across the current stack (the "learning" list is not counted). */
export function countStackTechnologies(skills: SkillsOverview): number {
  return new Set(skills.stack.flatMap((c) => c.technologies.map((t) => t.slug))).size;
}

/** Replaces derived metrics' stored values with live counts; static metrics pass through. */
export function resolveSnapshotMetrics(metrics: SnapshotMetric[], counts: MetricCounts): SnapshotMetric[] {
  return metrics.map((m) => {
    switch (m.source) {
      case 'published_projects':
        return { ...m, value: counts.publishedProjects };
      case 'technologies':
        return { ...m, value: counts.technologies };
      default:
        return m;
    }
  });
}
