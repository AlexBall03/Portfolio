import { z } from 'zod';
import { blankToNull, nullableText, text } from '@/lib/validation';
import { editableSections, PAGE_KEYS, SECTION_KEYS } from './types';

export const siteSettingsInput = z.object({
  brandMark: text(40),
  monogram: text(20),
  /** Blank means "no GitHub account": the section is hidden. */
  githubUsername: blankToNull(
    z
      .string()
      .trim()
      .regex(/^[a-z\d](?:[a-z\d]|-(?=[a-z\d])){0,38}$/i, 'Not a valid GitHub username')
      .nullish(),
  ),
  showGithubSection: z.boolean().default(true),
  defaultTheme: z.enum(['dark', 'light']).default('dark'),
});
export type SiteSettingsInput = z.infer<typeof siteSettingsInput>;

export const pageContentInput = z.object({ seoTitle: nullableText(70), seoDescription: text(200) });

/** Plain text only: rendered as text nodes, never as HTML. Blank optional fields are stored as null. */
export const sectionContentInput = z.object({
  eyebrow: text(60),
  title: text(120),
  subtitle: nullableText(300),
  body: nullableText(1000),
  aside: nullableText(60),
});

export const pagesInput = z.record(z.enum(PAGE_KEYS), pageContentInput);
export const sectionsInput = z.record(z.enum(SECTION_KEYS), sectionContentInput);

/* ── Admin editors ────────────────────────────────────────────────────────── */

/** One page's SEO copy plus the section headings its content editor owns. */
export const pageCopyInput = z
  .object({
    page: z.enum(PAGE_KEYS),
    seo: pageContentInput,
    sections: z.partialRecord(z.enum(SECTION_KEYS), sectionContentInput).default({}),
  })
  .superRefine((data, ctx) => {
    const allowed = new Set<string>(editableSections(data.page));
    for (const key of Object.keys(data.sections)) {
      if (!allowed.has(key)) ctx.addIssue({ code: 'custom', path: ['sections', key], message: 'Not editable on this page' });
    }
  });
export type PageCopyInput = z.infer<typeof pageCopyInput>;

/** The Contact editor's copy: the contact section's heading and introduction. */
export const contactCopyInput = sectionContentInput;
export type ContactCopyInput = z.infer<typeof contactCopyInput>;
