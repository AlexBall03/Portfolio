import type { Project, Technology } from './types';

export interface TechnologyUsage extends Technology {
  /** Published projects that list this technology. */
  count: number;
}

/**
 * How many published projects use each technology, derived from the projects'
 * own technology lists (`project_technologies`), so skills can link to real
 * work without a second mapping. Most used first, then by name.
 */
export function technologyUsage(projects: readonly Pick<Project, 'technologies'>[]): TechnologyUsage[] {
  const bySlug = new Map<string, TechnologyUsage>();
  for (const project of projects) {
    for (const tech of project.technologies) {
      const entry = bySlug.get(tech.slug);
      if (entry) entry.count += 1;
      else bySlug.set(tech.slug, { ...tech, count: 1 });
    }
  }
  return [...bySlug.values()].sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
}

/** Slug → project count, for quick lookups while rendering skills. */
export const usageCounts = (projects: readonly Pick<Project, 'technologies'>[]) =>
  new Map(technologyUsage(projects).map((t) => [t.slug, t.count]));
