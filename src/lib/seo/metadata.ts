import 'server-only';
import type { Metadata } from 'next';
import { absoluteUrl, SHARE_CARD_SIZE, shareCardUrl } from '@/config/site';
import { getProfile } from '@/features/profile/queries';
import { getPageContent } from '@/features/site/queries';
import type { PageKey } from '@/features/site/types';
import { DEFAULT_LOCALE, LOCALES, LOCALE_TAGS, type Locale } from '@/i18n/config';
import { getDictionary } from '@/i18n/get-dictionary';
import { localizedPath } from '@/i18n/paths';
import { shareCardVersion } from './share-card/inputs';

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

export interface PageMetadataInput {
  locale: Locale;
  /** Locale-less path, e.g. "/about". */
  path: string;
  title: string;
  description: string;
  /** The site's name (the owner's full name): og:site_name and the suffix of social titles. */
  siteName: string;
  /** Absolute document title (skips the "— Name" template). */
  absoluteTitle?: boolean;
  /** The share card's content version (`shareCardVersion`), so platforms re-scrape after edits. */
  shareVersion?: string | null;
}

/**
 * A page's complete metadata. Built whole rather than merged with the layout's:
 * Next.js replaces nested objects such as `openGraph`, so every page sets its
 * own site name, locale, and image.
 */
export function pageMetadata({
  locale,
  path,
  title,
  description,
  siteName,
  absoluteTitle,
  shareVersion,
}: PageMetadataInput): Metadata {
  const url = absoluteUrl(localizedPath(locale, path));
  // The <title> template adds "— Name"; social titles don't use it, so add it here.
  const socialTitle = absoluteTitle ? title : `${title} — ${siteName}`;
  // Every page has its own generated share card (app/og), in the page's locale.
  const share = { url: shareCardUrl(locale, path, shareVersion), ...SHARE_CARD_SIZE, alt: socialTitle, type: 'image/png' };
  return {
    title: absoluteTitle ? { absolute: title } : title,
    description,
    alternates: alternates(locale, path),
    openGraph: {
      type: 'website',
      siteName,
      url,
      title: socialTitle,
      description,
      locale: LOCALE_TAGS[locale].og,
      alternateLocale: LOCALES.filter((l) => l !== locale).map((l) => LOCALE_TAGS[l].og),
      images: [share],
    },
    twitter: {
      card: 'summary_large_image',
      title: socialTitle,
      description,
      images: [{ url: share.url, alt: share.alt, ...SHARE_CARD_SIZE }],
    },
  };
}

export interface PageSeo {
  title: string;
  description: string;
  /** True for home, whose title is already "Name — Title". */
  absoluteTitle: boolean;
  siteName: string;
}

/**
 * A top-level page's SEO copy: the database-managed title and description,
 * else safe fallbacks. Shared by <head> and the page's JSON-LD so they agree.
 */
export async function resolvePageSeo(page: PageKey, locale: Locale): Promise<PageSeo> {
  const [content, profile] = await Promise.all([getPageContent(page, locale), getProfile(locale)]);
  const isHome = page === 'home';
  return {
    title: content?.seoTitle || (isHome ? `${profile.fullName} — ${profile.title}` : getDictionary(locale).nav[page]),
    description: content?.seoDescription || profile.statement,
    absoluteTitle: isHome,
    siteName: profile.fullName,
  };
}

/** Metadata for a top-level page, from its database-managed SEO copy. */
export async function topLevelPageMetadata(page: PageKey, locale: Locale, path: string): Promise<Metadata> {
  const [seo, shareVersion] = await Promise.all([
    resolvePageSeo(page, locale),
    shareCardVersion(locale, { kind: 'page', page }),
  ]);
  return pageMetadata({ locale, path, ...seo, shareVersion });
}
