import type { z } from 'zod';
import { DEFAULT_LOCALE, isLocale, LOCALES, type Locale } from '@/i18n/config';

/**
 * Locale helpers shared by validation (server) and the editors (browser).
 *
 * The rule: a translation is either absent (every field blank; reads fall
 * back to English) or complete. English is never copied into another locale.
 */

/** True when a translation value carries no content: blank strings, empty lists, nothing set. */
export function isBlankTranslation(value: unknown): boolean {
  if (value === undefined || value === null) return true;
  if (typeof value === 'string') return value.trim() === '';
  if (Array.isArray(value)) return value.every(isBlankTranslation);
  if (typeof value === 'object') return Object.values(value).every(isBlankTranslation);
  return false;
}

export type TranslationStatus = 'complete' | 'partial' | 'missing';

/** Where one locale's copy of an entity stands, judged by the same schema the server saves with. */
export function translationStatus(schema: z.ZodType, value: unknown): TranslationStatus {
  if (isBlankTranslation(value)) return 'missing';
  return schema.safeParse(value).success ? 'complete' : 'partial';
}

export interface TranslationCoverage {
  complete: number;
  partial: number;
  missing: number;
}

/** Status counts for one locale across several entities' translation maps. */
export function translationCoverage(
  schema: z.ZodType,
  items: readonly Partial<Record<Locale, unknown>>[],
  locale: Locale,
): TranslationCoverage {
  const out: TranslationCoverage = { complete: 0, partial: 0, missing: 0 };
  for (const item of items) out[translationStatus(schema, item[locale])]++;
  return out;
}

/** The locales an editor offers, default first. */
export const EDITOR_LOCALES = [DEFAULT_LOCALE, ...LOCALES.filter((l) => l !== DEFAULT_LOCALE)] as const;

/**
 * Editor values for every locale from an entity's translation rows: a missing
 * row becomes `blank()` (an empty tab), never a copy of another locale.
 */
export function localeRecord<Row extends { locale: Locale }, V>(
  rows: readonly Row[],
  toValues: (row: Row) => V,
  blank: () => V,
): Record<Locale, V> {
  return Object.fromEntries(
    LOCALES.map((l) => {
      const row = rows.find((r) => r.locale === l);
      return [l, row ? toValues(row) : blank()];
    }),
  ) as Record<Locale, V>;
}

const RANK: Record<TranslationStatus, number> = { complete: 0, missing: 1, partial: 2 };

/** The status a list shows on its tab: any incomplete item wins, then any untranslated one. */
export function worstStatus(statuses: readonly TranslationStatus[]): TranslationStatus {
  return statuses.reduce<TranslationStatus>((worst, s) => (RANK[s] > RANK[worst] ? s : worst), 'complete');
}

/** Error counts per locale from editor error paths (`…translations.<locale>.…`). */
export function errorsByLocale(errors: Record<string, string>): Record<Locale, number> {
  const out = Object.fromEntries(LOCALES.map((l) => [l, 0])) as Record<Locale, number>;
  for (const key of Object.keys(errors)) {
    const locale = /(?:^|\.)translations\.([^.]+)/.exec(key)?.[1];
    if (isLocale(locale)) out[locale]++;
  }
  return out;
}

/** Per-locale tab status for one entity, or for a list of entities (worst item wins). */
export function localeStatuses(
  schema: z.ZodType,
  translations: readonly Partial<Record<Locale, unknown>>[],
): Record<Locale, TranslationStatus> {
  return Object.fromEntries(
    LOCALES.map((l) => [l, worstStatus(translations.map((t) => translationStatus(schema, t[l])))]),
  ) as Record<Locale, TranslationStatus>;
}

/** Blank editor values for every locale (a new list item). */
export function blankLocales<V>(blank: () => V): Record<Locale, V> {
  return Object.fromEntries(LOCALES.map((l) => [l, blank()])) as Record<Locale, V>;
}
