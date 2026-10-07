import { z } from 'zod';
import { accent, contentStatus, icon, localized, slug, text } from '@/lib/validation';

export const skillCategoryInput = z.object({
  slug,
  kind: z.enum(['stack', 'learning']).default('stack'),
  icon,
  accent: accent.default('blue'),
  status: contentStatus.default('published'),
  /** Technology slugs, in display order. */
  technologies: z.array(slug).min(1),
  translations: localized(z.object({ name: text(80) })),
});
export type SkillCategoryInput = z.infer<typeof skillCategoryInput>;
