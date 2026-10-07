import type { Technology } from '@/features/projects/types';

export type Accent = 'blue' | 'gold';

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
