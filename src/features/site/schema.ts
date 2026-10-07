import { z } from 'zod';
import { localized, optionalText, text } from '@/lib/validation';
import { PAGE_KEYS, SECTION_KEYS } from './types';

export const siteSettingsInput = z.object({
  brandMark: text(40),
  monogram: text(20),
  githubUsername: z
    .string()
    .trim()
    .regex(/^[a-z\d](?:[a-z\d]|-(?=[a-z\d])){0,38}$/i, 'Not a valid GitHub username')
    .nullish(),
  showGithubSection: z.boolean().default(true),
  defaultTheme: z.enum(['dark', 'light']).default('dark'),
});
export type SiteSettingsInput = z.infer<typeof siteSettingsInput>;

export const pageContentInput = localized(
  z.object({ seoTitle: optionalText(70), seoDescription: text(200) }),
);

export const sectionContentInput = localized(
  z.object({
    eyebrow: text(60),
    title: text(120),
    subtitle: optionalText(300),
    body: optionalText(1000),
  }),
);

export const pagesInput = z.record(z.enum(PAGE_KEYS), pageContentInput);
export const sectionsInput = z.record(z.enum(SECTION_KEYS), sectionContentInput);
