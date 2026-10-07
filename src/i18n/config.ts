export const LOCALES = ['en', 'es'] as const;
export type Locale = (typeof LOCALES)[number];

export const DEFAULT_LOCALE: Locale = 'en';

/** Cookie that remembers an explicit language choice (set by the locale toggle). */
export const LOCALE_COOKIE = 'locale';

export const isLocale = (value: unknown): value is Locale =>
  typeof value === 'string' && (LOCALES as readonly string[]).includes(value);

/** BCP 47 tags for Intl formatting and Open Graph. */
export const LOCALE_TAGS: Record<Locale, { intl: string; og: string; label: string }> = {
  en: { intl: 'en-US', og: 'en_US', label: 'English' },
  es: { intl: 'es-US', og: 'es_US', label: 'Español' },
};
