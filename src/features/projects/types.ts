import type { RepositoryLabel } from '@/features/github/types';
import type { MediaAsset } from '@/lib/media';
import type { MilestoneKind, MilestonePrecision, SectionKind } from './case-study';

export interface Technology {
  slug: string;
  name: string;
}

export interface ProjectRepository {
  provider: 'github';
  /** GitHub's stable id; null only for associations saved before Phase 5B. */
  githubId: number | null;
  owner: string;
  name: string;
  url: string;
  label: RepositoryLabel | null;
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
  /** The page shows GitHub analytics for `repositories` (admin switch; the admin preview shows them regardless). */
  githubAnalytics: boolean;
  cover: MediaAsset | null;
  gallery: MediaAsset[];
}

export interface CaseStudyItem {
  title: string;
  body: string | null;
}

/** One case-study section. Fields a kind doesn't use are empty. */
export interface CaseStudySection {
  id: string;
  kind: SectionKind;
  heading: string;
  /** Paragraphs with light inline markup (`lib/inline-markup.ts`). */
  body: string[];
  items: CaseStudyItem[];
  media: MediaAsset[];
  videoUrl: string | null;
  /** Only in the admin preview: the section isn't public yet. */
  hidden: boolean;
}

export interface Milestone {
  id: string;
  /** Calendar date (`YYYY-MM-DD`), shown at `precision`. */
  date: string;
  precision: MilestonePrecision;
  kind: MilestoneKind;
  title: string;
  description: string | null;
  url: string | null;
  image: MediaAsset | null;
  /** Only in the admin preview: the milestone isn't public yet. */
  hidden: boolean;
}

/** A project with everything its own page shows. Lists use the lighter `Project`. */
export interface ProjectCaseStudy extends Project {
  sections: CaseStudySection[];
  /** Chronological (oldest first). */
  milestones: Milestone[];
  /** Explicitly related projects, in order. Pages resolve them against published projects only. */
  relatedIds: string[];
}

/** Result of resolving a public project slug. */
export type ProjectLookup =
  | { kind: 'found'; project: ProjectCaseStudy }
  | { kind: 'redirect'; slug: string }
  | { kind: 'not-found' };

/* ── Admin editor values ──────────────────────────────────────────────────── */

export type ProjectStatus = 'draft' | 'published' | 'archived';

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
  name: string;
  tagline: string;
  summary: string;
  body: string[];
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
  cover: { src: string; alt: string } | null;
  publishedAt: string | null;
  updatedAt: string;
}

/** One image in a project's media editor. Order is gallery order; one may be the hero. */
export interface ProjectMediaItemValues {
  key: string;
  assetId: string;
  src: string;
  width: number | null;
  height: number | null;
  isCover: boolean;
  alt: string;
  caption: string;
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

/** One of the project's images, offered by the case-study and milestone editors. */
export interface ProjectImageChoice {
  assetId: string;
  src: string;
  alt: string;
}

export interface SectionItemValues {
  key: string;
  id?: string;
  title: string;
  body: string;
}

export interface SectionValues {
  key: string;
  id?: string;
  kind: SectionKind;
  visible: boolean;
  videoUrl: string;
  heading: string;
  body: string[];
  items: SectionItemValues[];
  /** Asset ids of the project's images, in display order. */
  media: string[];
}

export interface CaseStudyValues {
  sections: SectionValues[];
}

export interface MilestoneValues {
  key: string;
  id?: string;
  occurredOn: string;
  datePrecision: MilestonePrecision;
  kind: MilestoneKind;
  url: string;
  /** '' = no image. */
  assetId: string;
  visible: boolean;
  title: string;
  description: string;
}

export interface MilestonesValues {
  milestones: MilestoneValues[];
}

export interface RelatedProjectValues {
  key: string;
  id: string;
}

export interface RelatedValues {
  related: RelatedProjectValues[];
}

/** A project the Related editor can offer. */
export interface ProjectChoice {
  id: string;
  name: string;
  slug: string;
  status: ProjectStatus;
}

/** One repository association in the GitHub editor. `input` is owner/name or any GitHub URL. */
export interface RepositoryRowValues {
  key: string;
  id?: string;
  input: string;
  /** '' = no label. */
  label: RepositoryLabel | '';
  isPrimary: boolean;
}

export interface RepositoriesValues {
  analyticsVisible: boolean;
  repositories: RepositoryRowValues[];
  /** Read-only (ignored on save): what GitHub says about each stored row, by row id. */
  checks: Record<string, RepositoryCheck>;
}

/** What GitHub currently says about a stored association (admin only). */
export type RepositoryCheck =
  /** `renamedTo`: GitHub's current name, when it differs from the stored one (renamed or transferred). */
  | { status: 'public'; archived: boolean; renamedTo: string | null }
  | { status: 'private' | 'not-found' | 'unreachable' | 'unconfigured' };
