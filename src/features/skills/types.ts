import type { Technology } from '@/features/projects/types';

export type Accent = 'blue' | 'gold';

export type SkillCategoryKind = 'stack' | 'learning';

export interface SkillCategory {
  slug: string;
  name: string;
  icon: string;
  accent: Accent;
  technologies: Technology[];
}

export interface SkillsOverview {
  /** What I work with today, grouped by category. */
  stack: SkillCategory[];
  /** What I'm learning next (the "Looking Ahead" banner). */
  learning: SkillCategory[];
}

/* ── Admin editor values ──────────────────────────────────────────────────── */

export interface SkillCategoryValues {
  key: string;
  id?: string;
  slug: string;
  name: string;
  icon: string;
  accent: Accent;
  visible: boolean;
  /** In display order; `key` is the technology slug. */
  technologies: (Technology & { key: string })[];
}

export type SkillCategoriesValues = Record<SkillCategoryKind, SkillCategoryValues[]>;

export interface TechnologyValues {
  key: string;
  id: string;
  slug: string;
  name: string;
  /** How many projects and skill categories list it (it can be removed only when both are 0). */
  projects: number;
  categories: number;
}
