import type { MediaAsset } from '@/lib/media';

export interface Technology {
  slug: string;
  name: string;
}

export interface ProjectRepository {
  provider: 'github';
  owner: string;
  name: string;
  url: string;
  isPrimary: boolean;
}

/** A published project as the public portfolio presents it. */
export interface Project {
  id: string;
  slug: string;
  name: string;
  tagline: string;
  summary: string;
  featured: boolean;
  isLive: boolean;
  links: { demo: string | null; source: string | null; details: string | null };
  technologies: Technology[];
  repositories: ProjectRepository[];
  cover: MediaAsset | null;
  gallery: MediaAsset[];
}

/** Result of resolving a public project slug. */
export type ProjectLookup =
  | { kind: 'found'; project: Project }
  | { kind: 'redirect'; slug: string }
  | { kind: 'not-found' };
