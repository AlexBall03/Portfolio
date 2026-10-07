import { notFound } from 'next/navigation';
import { isLocale, type Locale } from '@/i18n/config';

export interface LocaleParams {
  params: Promise<{ locale: string }>;
}

/** Resolves and validates the `[locale]` route segment. */
export async function resolveLocale(params: LocaleParams['params']): Promise<Locale> {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  return locale;
}
