import { z } from 'zod';
import { blankToNull, contentStatus, localized, mediaInput, nullableText, slug, text, url } from '@/lib/validation';

export const technologyInput = z.object({ slug, name: text(60) });
export type TechnologyInput = z.infer<typeof technologyInput>;

/** One locale's project copy. `body` paragraphs are optional; blank ones are dropped. */
export const projectTranslationInput = z.object({
  name: text(120),
  tagline: text(200),
  summary: text(2000),
  body: z
    .array(z.string().trim().max(2000, 'At most 2000 characters'))
    .max(12, 'At most 12 paragraphs')
    .default([])
    .transform((paragraphs) => paragraphs.filter(Boolean)),
});

/** Seed content (and the shape every project write builds on). */
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
  translations: localized(projectTranslationInput),
});
export type ProjectInput = z.infer<typeof projectInput>;

const githubName = z
  .string()
  .trim()
  .min(1, 'Required')
  .max(100)
  .regex(/^[A-Za-z0-9._-]+$/, 'Letters, numbers, ".", "-" and "_" only');

const optionalUrl = blankToNull(url.nullable());

/** The project editor (Details). Status changes ride along: Publish = save with `published`. */
export const projectEditorInput = z.object({
  id: z.uuid().nullish(),
  slug,
  status: contentStatus,
  featured: z.boolean(),
  isLive: z.boolean(),
  demoUrl: optionalUrl,
  sourceUrl: optionalUrl,
  detailsUrl: optionalUrl,
  technologies: z
    .array(technologyInput)
    .max(20, 'At most 20 technologies')
    .refine((list) => new Set(list.map((t) => t.slug)).size === list.length, 'Each technology can be listed once'),
  repositories: z
    .array(z.object({ id: z.string().optional(), owner: githubName, name: githubName, isPrimary: z.boolean() }))
    .max(10, 'At most 10 repositories')
    .refine((list) => list.filter((r) => r.isPrimary).length <= 1, 'Only one repository can be primary')
    .refine(
      (list) => new Set(list.map((r) => `${r.owner}/${r.name}`.toLowerCase())).size === list.length,
      'Each repository can be listed once',
    ),
  translations: localized(projectTranslationInput),
});
export type ProjectEditorInput = z.infer<typeof projectEditorInput>;

export const deleteProjectInput = z.object({ id: z.uuid(), confirmSlug: z.string().trim() });

export const projectOrderInput = z
  .object({
    featured: z.array(z.object({ id: z.uuid() })),
    other: z.array(z.object({ id: z.uuid() })),
  })
  .refine((v) => {
    const ids = [...v.featured, ...v.other].map((p) => p.id);
    return new Set(ids).size === ids.length;
  }, 'Each project can appear once');
export type ProjectOrderInput = z.infer<typeof projectOrderInput>;

/** One locale's image text: alt is required once the locale is filled in, captions are optional. */
export const mediaTranslationInput = z.object({ alt: text(300), caption: nullableText(300) });

export const projectMediaInput = z.object({
  projectId: z.uuid(),
  items: z
    .array(z.object({ assetId: z.uuid(), isCover: z.boolean(), translations: localized(mediaTranslationInput) }))
    .max(24, 'At most 24 images')
    .refine((items) => items.filter((i) => i.isCover).length <= 1, 'Choose one hero image'),
});
export type ProjectMediaInput = z.infer<typeof projectMediaInput>;

/** Text sent with an upload (multipart fields `alt.en`, `alt.es`). */
export const uploadMetaInput = z.object({ translations: localized(mediaTranslationInput) });
export type UploadMetaInput = z.infer<typeof uploadMetaInput>;
