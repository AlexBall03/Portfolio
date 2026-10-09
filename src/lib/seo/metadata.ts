import 'server-only';
import type { Metadata } from 'next';
import { absoluteUrl, SHARE_CARD_SIZE, shareCardPath } from '@/config/site';
import { getProfile } from '@/features/profile/queries';
import { getPageContent } from '@/features/site/queries';
import type { PageKey } from '@/features/site/types';
import { DEFAULT_LOCALE, LOCALES, LOCALE_TAGS, type Locale } from '@/i18n/config';
import { getDictionary } from '@/i18n/get-dictionary';
import { localizedPath } from '@/i18n/paths';

/** Canonical + hreflang alternates for a locale-less path. */
export function alternates(locale: Locale, path: string): Metadata['alternates'] {
  return {
    canonical: absoluteUrl(localizedPath(locale, path)),
    languages: {
      ...Object.fromEntries(LOCALES.map((l) => [l, absoluteUrl(localizedPath(l, path))])),
      'x-default': absoluteUrl(localizedPath(DEFAULT_LOCALE, path)),
    },
  };
}

interface PageMetadataInput {
  locale: Locale;
  /** Locale-less path, e.g. "/about". */
  path: string;
  title: string;
  description: string;
  /** Absolute document title (skips the "— Name" template). */
  absoluteTitle?: boolean;
}

export function pageMetadata({ locale, path, title, description, absoluteTitle }: PageMetadataInput): Metadata {
  const url = absoluteUrl(localizedPath(locale, path));
  // Every page has its own generated share card (app/og), in the page's locale.
  const share = { url: absoluteUrl(shareCardPath(locale, path)), ...SHARE_CARD_SIZE, alt: title, type: 'image/png' };
  return {
    title: absoluteTitle ? { absolute: title } : title,
    description,
    alternates: alternates(locale, path),
    openGraph: {
      type: 'website',
      url,
      title,
      description,
      locale: LOCALE_TAGS[locale].og,
      alternateLocale: LOCALES.filter((l) => l !== locale).map((l) => LOCALE_TAGS[l].og),
      images: [share],
    },
    twitter: { card: 'summary_large_image', title, description, images: [share.url] },
  };
}

/** Metadata for a top-level page, from its database-managed SEO copy. */
export async function topLevelPageMetadata(page: PageKey, locale: Locale, path: string): Promise<Metadata> {
  const [content, profile] = await Promise.all([getPageContent(page, locale), getProfile(locale)]);
  const isHome = page === 'home';
  const title = content?.seoTitle ?? (isHome ? `${profile.fullName} — ${profile.title}` : getDictionary(locale).nav[page]);
  return pageMetadata({
    locale,
    path,
    title,
    description: content?.seoDescription ?? profile.statement,
    absoluteTitle: isHome,
  });
}
