import { DEFAULT_LOCALE, type Locale } from '@/i18n/config';
import { pickTranslation } from '@/i18n/translations';

export type MediaStorage = 'static' | 'blob' | 'external';

/** A media asset resolved for rendering. Storage details never leak past here. */
export interface MediaAsset {
  src: string;
  alt: string;
  caption: string | null;
  width: number | null;
  height: number | null;
  mimeType: string | null;
}

interface MediaRow {
  storage: MediaStorage;
  src: string;
  width: number | null;
  height: number | null;
  mimeType: string | null;
  translations: readonly { locale: Locale; alt: string; caption?: string | null }[];
}

/**
 * Resolves a stored asset to a renderable URL. Static assets are site-relative
 * paths under /public; blob and external assets are stored as absolute URLs.
 * A future storage backend that needs signing or a CDN prefix plugs in here.
 */
export function resolveMedia(row: MediaRow | null | undefined, locale: Locale): MediaAsset | null {
  if (!row) return null;
  const src = row.storage === 'static' ? `/${row.src.replace(/^\/+/, '')}` : row.src;
  const t = pickTranslation(row.translations, locale);
  // Captions are optional per locale: a translation without one keeps the English caption.
  const caption = t?.caption || pickTranslation(row.translations, DEFAULT_LOCALE)?.caption || null;
  return {
    src,
    alt: t?.alt ?? '',
    caption,
    width: row.width,
    height: row.height,
    mimeType: row.mimeType,
  };
}
