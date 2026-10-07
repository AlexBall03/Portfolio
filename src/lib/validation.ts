import { z } from 'zod';
import { DEFAULT_LOCALE, LOCALES, type Locale } from '@/i18n/config';

/**
 * Per-locale content: the default locale is required, the others optional
 * (missing ones fall back to the default at read time).
 */
export function localized<T extends z.ZodType>(schema: T) {
  const shape = Object.fromEntries(
    LOCALES.map((l) => [l, l === DEFAULT_LOCALE ? schema : schema.optional()]),
  ) as { [K in Locale]: K extends typeof DEFAULT_LOCALE ? T : z.ZodOptional<T> };
  return z.object(shape);
}

export const slug = z
  .string()
  .trim()
  .min(1)
  .max(80)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Use lowercase letters, numbers, and single hyphens');

export const text = (max = 500) => z.string().trim().min(1).max(max);
export const optionalText = (max = 500) => z.string().trim().max(max).nullish();
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
