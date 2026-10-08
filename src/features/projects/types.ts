import type { Locale } from '@/i18n/config';
import type { TranslationStatus } from '@/lib/cms/locale';
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
  /** Further description paragraphs (may be empty). */
  body: string[];
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

/* ── Admin editor values ──────────────────────────────────────────────────── */

export type ProjectStatus = 'draft' | 'published' | 'archived';

export interface ProjectTranslationValues {
  name: string;
  tagline: string;
  summary: string;
  body: string[];
}

export interface ProjectRepositoryValues {
  key: string;
  id?: string;
  owner: string;
  name: string;
  isPrimary: boolean;
}

export interface ProjectTechnologyValues {
  key: string;
  slug: string;
  name: string;
}

/** The project editor's form state. `id` is null for a project not created yet. */
export interface ProjectValues {
  id: string | null;
  slug: string;
  status: ProjectStatus;
  featured: boolean;
  isLive: boolean;
  demoUrl: string;
  sourceUrl: string;
  detailsUrl: string;
  technologies: ProjectTechnologyValues[];
  repositories: ProjectRepositoryValues[];
  translations: Record<Locale, ProjectTranslationValues>;
  /** Read-only (ignored on save): when the project last went live. */
  publishedAt: string | null;
}

/** A row in the admin project list. */
export interface ProjectListItem {
  id: string;
  slug: string;
  name: string;
  status: ProjectStatus;
  featured: boolean;
  sortOrder: number;
  translation: Record<Locale, TranslationStatus>;
  cover: { src: string; alt: string } | null;
  publishedAt: string | null;
  updatedAt: string;
}

export interface ProjectMediaTranslationValues {
  alt: string;
  caption: string;
}

/** One image in a project's media editor. Order is gallery order; one may be the hero. */
export interface ProjectMediaItemValues {
  key: string;
  assetId: string;
  src: string;
  width: number | null;
  height: number | null;
  isCover: boolean;
  translations: Record<Locale, ProjectMediaTranslationValues>;
}

export interface ProjectMediaValues {
  items: ProjectMediaItemValues[];
}

export interface ProjectOrderItem {
  key: string;
  id: string;
  name: string;
  slug: string;
  status: ProjectStatus;
}

/** Editorial order: featured first (the public order), then the rest. */
export interface ProjectOrderValues {
  featured: ProjectOrderItem[];
  other: ProjectOrderItem[];
}
