import { z } from 'zod';
import { blankToNull, contentStatus, isoDate, localized, mediaInput, nullableText, slug, text, url } from '@/lib/validation';
import {
  MAX_MILESTONES,
  MAX_RELATED,
  MAX_SECTION_ITEMS,
  MAX_SECTION_MEDIA,
  MAX_SECTIONS,
  MILESTONE_KINDS,
  MILESTONE_PRECISIONS,
  SECTION_KINDS,
  SECTION_SPECS,
  type SectionKind,
} from './case-study';

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

/* ── Case study, milestones, related projects ───────────────────────────────
 * Structure is shared by every locale; text is per locale (`localized`).
 * Which fields a section uses depends on its kind (`SECTION_SPECS`): fields a
 * kind doesn't use must be empty, and required ones must be present in every
 * locale that is filled in.
 */

const paragraphs = z
  .array(z.string().trim().max(4000, 'At most 4000 characters'))
  .max(20, 'At most 20 paragraphs')
  .default([])
  .transform((list) => list.filter(Boolean));

/** One locale's section text. */
export const sectionTranslationInput = z.object({ heading: text(120), body: paragraphs });

/** The same, with the kind's rule on paragraphs (editor status uses it, so badge and save agree). */
export const sectionTranslationFor = (kind: SectionKind) =>
  SECTION_SPECS[kind].body === 'required'
    ? sectionTranslationInput.refine((t) => t.body.length > 0, { message: 'Add at least one paragraph', path: ['body'] })
    : sectionTranslationInput;

export const sectionItemTranslationInput = z.object({ title: text(200), body: nullableText(2000) });

const uniqueIds = (list: readonly string[]) => new Set(list).size === list.length;

const projectSectionInput = z
  .object({
    id: z.string().optional(),
    kind: z.enum(SECTION_KINDS),
    visible: z.boolean(),
    videoUrl: optionalUrl,
    translations: localized(sectionTranslationInput),
    items: z
      .array(z.object({ id: z.string().optional(), translations: localized(sectionItemTranslationInput) }))
      .max(MAX_SECTION_ITEMS, `At most ${MAX_SECTION_ITEMS} entries`)
      .default([]),
    media: z
      .array(z.uuid())
      .max(MAX_SECTION_MEDIA, `At most ${MAX_SECTION_MEDIA} images`)
      .default([])
      .refine(uniqueIds, 'Each image can be shown once'),
  })
  .superRefine((s, ctx) => {
    const spec = SECTION_SPECS[s.kind];
    const issue = (path: (string | number)[], message: string) => ctx.addIssue({ code: 'custom', path, message });
    for (const [locale, t] of Object.entries(s.translations)) {
      if (!t) continue;
      if (spec.body === false && t.body.length) issue(['translations', locale, 'body'], 'This section type has no paragraphs');
      if (spec.body === 'required' && !t.body.length) issue(['translations', locale, 'body'], 'Add at least one paragraph');
    }
    if (spec.items === false && s.items.length) issue(['items'], 'This section type has no entries');
    if (spec.items && !s.items.length) issue(['items'], `Add at least one ${spec.items.noun}`);
    if (spec.media === false && s.media.length) issue(['media'], 'This section type has no images');
    if (spec.media === 'required' && !s.media.length) issue(['media'], 'Choose at least one image');
    if (!spec.video && s.videoUrl) issue(['videoUrl'], 'This section type has no video');
    if (spec.video && !s.videoUrl) issue(['videoUrl'], 'Required');
  });

export const projectSectionsInput = z.object({
  projectId: z.uuid(),
  sections: z.array(projectSectionInput).max(MAX_SECTIONS, `At most ${MAX_SECTIONS} sections`),
});
export type ProjectSectionsInput = z.infer<typeof projectSectionsInput>;

export const milestoneTranslationInput = z.object({ title: text(160), description: nullableText(1000) });

export const projectMilestonesInput = z.object({
  projectId: z.uuid(),
  milestones: z
    .array(
      z.object({
        id: z.string().optional(),
        occurredOn: isoDate,
        datePrecision: z.enum(MILESTONE_PRECISIONS),
        kind: z.enum(MILESTONE_KINDS),
        url: optionalUrl,
        assetId: blankToNull(z.uuid().nullable()),
        visible: z.boolean(),
        translations: localized(milestoneTranslationInput),
      }),
    )
    .max(MAX_MILESTONES, `At most ${MAX_MILESTONES} milestones`),
});
export type ProjectMilestonesInput = z.infer<typeof projectMilestonesInput>;

export const projectRelationsInput = z
  .object({
    projectId: z.uuid(),
    related: z
      .array(z.object({ id: z.uuid() }))
      .max(MAX_RELATED, `At most ${MAX_RELATED} related projects`)
      .refine((list) => uniqueIds(list.map((r) => r.id)), 'Each project can be listed once'),
  })
  .refine((v) => v.related.every((r) => r.id !== v.projectId), {
    message: 'A project can’t be related to itself',
    path: ['related'],
  });
export type ProjectRelationsInput = z.infer<typeof projectRelationsInput>;
