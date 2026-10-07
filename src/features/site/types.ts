export const PAGE_KEYS = ['home', 'about', 'projects', 'experience', 'resume', 'contact'] as const;
export type PageKey = (typeof PAGE_KEYS)[number];

export const SECTION_KEYS = [
  'snapshot',
  'about',
  'stack',
  'projects',
  'github',
  'experience',
  'resume',
  'contact',
] as const;
export type SectionKey = (typeof SECTION_KEYS)[number];

export interface SiteSettings {
  brandMark: string;
  monogram: string;
  githubUsername: string | null;
  showGithubSection: boolean;
  defaultTheme: 'dark' | 'light';
}

export interface PageContent {
  seoTitle: string | null;
  seoDescription: string;
}

export interface SectionContent {
  eyebrow: string;
  title: string;
  subtitle: string | null;
  body: string | null;
}
