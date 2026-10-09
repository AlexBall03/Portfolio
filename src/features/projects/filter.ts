import type { Project } from './types';

/** What the projects explorer needs to match a project: no rendering data. */
export interface FilterableProject {
  id: string;
  featured: boolean;
  isLive: boolean;
  techSlugs: string[];
  /** Normalized searchable text: name, tagline, summary, technology names. */
  text: string;
}

export interface ProjectFilters {
  query: string;
  /** Technology slugs; a project must use every one. */
  techs: readonly string[];
  liveOnly: boolean;
}

export const NO_FILTERS: ProjectFilters = { query: '', techs: [], liveOnly: false };

/** Lowercase, accent-insensitive, single-spaced: "Diseño  Web" → "diseno web". */
export function normalizeText(text: string): string {
  return text
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

export function toFilterable(p: Project): FilterableProject {
  return {
    id: p.id,
    featured: p.featured,
    isLive: p.isLive,
    techSlugs: p.technologies.map((t) => t.slug),
    text: normalizeText([p.name, p.tagline, p.summary, ...p.technologies.map((t) => t.name)].join(' ')),
  };
}

export const hasFilters = (f: ProjectFilters) => f.query.trim() !== '' || f.techs.length > 0 || f.liveOnly;

/**
 * The projects matching every filter, in their original (CMS) order. Each
 * search word must appear somewhere in the project's text.
 */
export function filterProjects<T extends FilterableProject>(projects: readonly T[], f: ProjectFilters): T[] {
  const words = normalizeText(f.query).split(' ').filter(Boolean);
  return projects.filter(
    (p) =>
      (!f.liveOnly || p.isLive) &&
      f.techs.every((slug) => p.techSlugs.includes(slug)) &&
      words.every((w) => p.text.includes(w)),
  );
}

/** Filters from a URL query (`?q=…&tech=a,b&live=1`), keeping only known technologies. */
export function parseFilters(params: URLSearchParams, known: ReadonlySet<string>): ProjectFilters {
  const techs = (params.get('tech') ?? '')
    .split(',')
    .map((s) => s.trim())
    .filter((s, i, all) => known.has(s) && all.indexOf(s) === i);
  return { query: (params.get('q') ?? '').slice(0, 100), techs, liveOnly: params.get('live') === '1' };
}

/** The URL query for a set of filters (empty when none are active). */
export function filtersToQuery(f: ProjectFilters): string {
  const params = new URLSearchParams();
  if (f.query.trim()) params.set('q', f.query.trim());
  if (f.techs.length) params.set('tech', f.techs.join(','));
  if (f.liveOnly) params.set('live', '1');
  const query = params.toString().replace(/%2C/g, ',');
  return query ? `?${query}` : '';
}

/** The explorer link for one technology: /projects?tech=<slug>. */
export const techQuery = (slug: string) => filtersToQuery({ ...NO_FILTERS, techs: [slug] });
