import { z } from 'zod';
import { isIconName } from '@/components/ui/icons';
import { technologyInput } from '@/features/projects/schema';
import { accent, contentStatus, icon, localized, slug, text } from '@/lib/validation';

export const skillCategoryTranslationInput = z.object({ name: text(80) });

export const skillCategoryInput = z.object({
  slug,
  kind: z.enum(['stack', 'learning']).default('stack'),
  icon,
  accent: accent.default('blue'),
  status: contentStatus.default('published'),
  /** Technology slugs, in display order. */
  technologies: z.array(slug).min(1),
  translations: localized(skillCategoryTranslationInput),
});
export type SkillCategoryInput = z.infer<typeof skillCategoryInput>;

/* ── Admin editors ──────────────────────────────────────────────────────────
 * Categories: both lists in one save, the kind from the list a category is
 * in, list position as public order. Technologies: the shared vocabulary
 * (names only; slugs are stable identifiers).
 */

const categoryItem = z.object({
  id: z.uuid().optional(),
  slug,
  icon: z.string().trim().refine(isIconName, 'Choose an icon from the set'),
  accent: accent.default('blue'),
  visible: z.boolean().default(true),
  technologies: z
    .array(technologyInput)
    .min(1, 'Add at least one technology')
    .max(30, 'At most 30 technologies')
    .refine((list) => new Set(list.map((t) => t.slug)).size === list.length, 'Each technology can be listed once'),
  translations: localized(skillCategoryTranslationInput),
});

export const skillCategoriesInput = z
  .object({
    stack: z.array(categoryItem).max(20, 'At most 20 categories'),
    learning: z.array(categoryItem).max(5, 'At most 5 banners'),
  })
  .superRefine((data, ctx) => {
    const seen = new Set<string>();
    for (const kind of ['stack', 'learning'] as const) {
      data[kind].forEach((c, i) => {
        if (seen.has(c.slug)) ctx.addIssue({ code: 'custom', path: [kind, i, 'slug'], message: 'Another category uses this slug' });
        seen.add(c.slug);
      });
    }
  });
export type SkillCategoriesInput = z.infer<typeof skillCategoriesInput>;

export const technologiesInput = z.object({
  items: z
    .array(z.object({ id: z.uuid(), name: text(60) }))
    .superRefine((items, ctx) => {
      const seen = new Set<string>();
      items.forEach((t, i) => {
        const name = t.name.toLowerCase();
        if (seen.has(name)) ctx.addIssue({ code: 'custom', path: [i, 'name'], message: 'Another technology has this name' });
        seen.add(name);
      });
    }),
});
export type TechnologiesInput = z.infer<typeof technologiesInput>;
