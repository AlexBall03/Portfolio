import { z } from 'zod';
import { DEFAULT_LOCALE, LOCALES, type Locale } from '@/i18n/config';
import { isBlankTranslation } from '@/lib/cms/locale';

/** Treats a non-default locale left entirely blank as absent (see `localized`). */
const blankAsMissing = <T extends z.ZodType>(schema: T) =>
  z.preprocess((value) => (isBlankTranslation(value) ? undefined : value), schema.optional());

/**
 * Per-locale content: the default locale is required, the others optional
 * (missing ones fall back to the default at read time).
 *
 * A non-default locale whose fields are all blank counts as missing, so an
 * editor's empty Spanish tab means "not translated" (English fallback) rather
 * than a failed save; a partly filled one is validated in full. English is
 * never copied into another locale.
 */
export function localized<T extends z.ZodType>(schema: T) {
  const shape = Object.fromEntries(
    LOCALES.map((l) => [l, l === DEFAULT_LOCALE ? schema : blankAsMissing(schema)]),
  ) as { [K in Locale]: K extends typeof DEFAULT_LOCALE ? T : ReturnType<typeof blankAsMissing<T>> };
  return z.object(shape);
}

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
  alt: localized(text(300)),
});
export type MediaInput = z.infer<typeof mediaInput>;
