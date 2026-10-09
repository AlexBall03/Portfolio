import 'server-only';
import type { Metadata } from 'next';
import { copy } from '@/config/copy';
import { absoluteUrl, OG_LOCALE, SHARE_CARD_SIZE, shareCardUrl } from '@/config/site';
import { getProfile } from '@/features/profile/queries';
import { getPageContent } from '@/features/site/queries';
import type { PageKey } from '@/features/site/types';
import { shareCardVersion } from './share-card/inputs';

export interface PageMetadataInput {
  /** Site path, e.g. "/about". */
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
export function pageMetadata({ path, title, description, siteName, absoluteTitle, shareVersion }: PageMetadataInput): Metadata {
  const url = absoluteUrl(path);
  // The <title> template adds "— Name"; social titles don't use it, so add it here.
  const socialTitle = absoluteTitle ? title : `${title} — ${siteName}`;
  // Every page has its own generated share card (app/og).
  const share = { url: shareCardUrl(path, shareVersion), ...SHARE_CARD_SIZE, alt: socialTitle, type: 'image/png' };
  return {
    title: absoluteTitle ? { absolute: title } : title,
    description,
    alternates: { canonical: url },
    openGraph: {
      type: 'website',
      siteName,
      url,
      title: socialTitle,
      description,
      locale: OG_LOCALE,
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
export async function resolvePageSeo(page: PageKey): Promise<PageSeo> {
  const [content, profile] = await Promise.all([getPageContent(page), getProfile()]);
  const isHome = page === 'home';
  return {
    title: content?.seoTitle || (isHome ? `${profile.fullName} — ${profile.title}` : copy.nav[page]),
    description: content?.seoDescription || profile.statement,
    absoluteTitle: isHome,
    siteName: profile.fullName,
  };
}

/** Metadata for a top-level page, from its database-managed SEO copy. */
export async function topLevelPageMetadata(page: PageKey, path: string): Promise<Metadata> {
  const [seo, shareVersion] = await Promise.all([resolvePageSeo(page), shareCardVersion({ kind: 'page', page })]);
  return pageMetadata({ path, ...seo, shareVersion });
}
