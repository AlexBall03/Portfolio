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
  'featured',
  'toolkit',
  'cta',
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
  /** Secondary heading inside the section (About: differentiators; Stack: the learning banner). */
  aside: string | null;
}

/** Configuration editor values: the stored settings, with "no GitHub account" as an empty field. */
export type SiteSettingsValues = Omit<SiteSettings, 'githubUsername'> & { githubUsername: string };

/* ── Page content editor ────────────────────────────────────────────────────
 * Which public page shows which section, and which heading fields each section
 * actually renders. Code-owned: the composition of a page is Next.js code; the
 * copy inside it is content.
 */

export type SectionField = 'eyebrow' | 'title' | 'subtitle' | 'body' | 'aside';

export interface SectionDescriptor {
  label: string;
  /** Fields the public section renders, with where each one appears. */
  fields: Partial<Record<SectionField, string>>;
  /** Another editor owns this section's copy (shown as a link instead of fields). */
  ownedBy?: 'contact';
}

const HEADER_FIELDS = {
  eyebrow: 'Small label above the heading',
  title: 'Section heading',
  subtitle: 'Line under the heading',
} as const;

const PAGE_HEADER_FIELDS = { ...HEADER_FIELDS, title: 'Page heading (h1)' } as const;

export const SECTIONS: Record<SectionKey, SectionDescriptor> = {
  snapshot: { label: 'Technical snapshot', fields: PAGE_HEADER_FIELDS },
  about: { label: 'About', fields: { ...HEADER_FIELDS, aside: 'Heading above the differentiator cards' } },
  stack: { label: 'Technology stack', fields: { ...HEADER_FIELDS, aside: 'Label on the "learning next" banner' } },
  projects: { label: 'Projects', fields: PAGE_HEADER_FIELDS },
  github: { label: 'GitHub activity', fields: HEADER_FIELDS },
  experience: { label: 'Experience', fields: PAGE_HEADER_FIELDS },
  resume: { label: 'Resume', fields: PAGE_HEADER_FIELDS },
  featured: { label: 'Selected work (home)', fields: HEADER_FIELDS },
  toolkit: { label: 'Toolkit (home)', fields: HEADER_FIELDS },
  cta: {
    label: 'Closing call to action (home)',
    fields: { eyebrow: 'Small label above the line', title: 'Closing line', subtitle: 'Line under it' },
  },
  contact: {
    label: 'Contact',
    fields: { eyebrow: 'Small label above the heading', title: 'Page heading (h1)', body: 'Introduction under the heading' },
    ownedBy: 'contact',
  },
};

export interface PageDescriptor {
  label: string;
  /** Public path. */
  path: string;
  sections: readonly SectionKey[];
}

export const PAGES: Record<PageKey, PageDescriptor> = {
  home: { label: 'Home', path: '/', sections: ['featured', 'toolkit', 'cta'] },
  about: { label: 'About', path: '/about', sections: ['snapshot', 'about', 'stack'] },
  projects: { label: 'Projects', path: '/projects', sections: ['projects', 'github'] },
  experience: { label: 'Experience', path: '/experience', sections: ['experience'] },
  resume: { label: 'Resume', path: '/resume', sections: ['resume'] },
  contact: { label: 'Contact', path: '/contact', sections: ['contact'] },
};

/** Sections a page's content editor edits (sections owned by another editor are excluded). */
export const editableSections = (page: PageKey) => PAGES[page].sections.filter((k) => !SECTIONS[k].ownedBy);

export interface SeoValues {
  seoTitle: string;
  seoDescription: string;
}

export interface SectionCopyValues {
  eyebrow: string;
  title: string;
  subtitle: string;
  body: string;
  aside: string;
}

export interface PageCopyValues {
  page: PageKey;
  seo: SeoValues;
  sections: Partial<Record<SectionKey, SectionCopyValues>>;
}

/**
 * A section's stored copy, or the interface's fallback when the section has no
 * row yet (a database from before the section existed). Edited in Page content.
 */
export function sectionOr(section: SectionContent, fallback: Pick<SectionContent, 'eyebrow' | 'title' | 'subtitle'>): SectionContent {
  return section.title ? section : { ...fallback, body: null, aside: null };
}
