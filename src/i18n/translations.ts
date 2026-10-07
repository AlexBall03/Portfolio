import { DEFAULT_LOCALE, type Locale } from './config';

/**
 * Picks the best translation row for `locale`: exact match, then the default
 * locale, then anything. Content therefore never disappears for a Spanish
 * visitor just because one item hasn't been translated yet.
 */
export function pickTranslation<T extends { locale: Locale }>(
  rows: readonly T[],
  locale: Locale,
): T | undefined {
  return (
    rows.find((r) => r.locale === locale) ??
    rows.find((r) => r.locale === DEFAULT_LOCALE) ??
    rows[0]
  );
}

/**
 * Maps rows to domain objects, dropping any row that has no translation at
 * all (an incomplete draft) instead of rendering empty strings.
 */
export function mapTranslated<R extends { translations: readonly { locale: Locale }[] }, Out>(
  rows: readonly R[],
  locale: Locale,
  map: (row: R, t: R['translations'][number]) => Out,
): Out[] {
  const out: Out[] = [];
  for (const row of rows) {
    const t = pickTranslation(row.translations, locale);
    if (t) out.push(map(row, t));
  }
  return out;
}
