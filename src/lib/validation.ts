import { z } from 'zod';
export const slug = z
  .string()
  .trim()
  .min(1)
  .max(80)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Use lowercase letters, numbers, and single hyphens');

const tooLong = (max: number) => `At most ${max} characters`;
export const text = (max = 500) => z.string().trim().min(1, 'Required').max(max, tooLong(max));
export const optionalText = (max = 500) => z.string().trim().max(max, tooLong(max)).nullish();
/** An empty form input means "none": stored as null, never as ''. */
export const blankToNull = <T extends z.ZodType>(schema: T) =>
  z.preprocess((v) => (typeof v === 'string' && !v.trim() ? null : v), schema);
export const nullableText = (max = 500) => blankToNull(optionalText(max));
export const url = z.url({ protocol: /^https?$/ });
export const isoDate = z.iso.date();
export const accent = z.enum(['blue', 'gold']);
export const contentStatus = z.enum(['draft', 'published', 'archived']);
export const icon = z.string().trim().min(1).max(40);

/** A media reference: a /public path, or an absolute URL for blob/external storage. */
export const mediaInput = z.object({
  storage: z.enum(['static', 'blob', 'external']),
  src: z.string().trim().min(1),
  mimeType: z.string().nullish(),
  width: z.number().int().positive().nullish(),
  height: z.number().int().positive().nullish(),
  alt: text(300),
});
export type MediaInput = z.infer<typeof mediaInput>;
