import { z } from 'zod';
import { contentStatus, localized, mediaInput, slug, text, url } from '@/lib/validation';

export const technologyInput = z.object({ slug, name: text(60) });
export type TechnologyInput = z.infer<typeof technologyInput>;

export const projectInput = z.object({
  slug,
  status: contentStatus.default('draft'),
  featured: z.boolean().default(false),
  isLive: z.boolean().default(false),
  demoUrl: url.nullish(),
  sourceUrl: url.nullish(),
  detailsUrl: url.nullish(),
  /** Technology slugs, in display order. */
  technologies: z.array(slug).default([]),
  repositories: z
    .array(
      z.object({
        owner: text(100),
        name: text(100),
        isPrimary: z.boolean().default(false),
      }),
    )
    .default([]),
  cover: mediaInput.nullish(),
  translations: localized(
    z.object({
      name: text(120),
      tagline: text(200),
      summary: text(2000),
    }),
  ),
});
export type ProjectInput = z.infer<typeof projectInput>;
