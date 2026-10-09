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
  alt: string;
  caption?: string | null;
}

/**
 * Resolves a stored asset to a renderable URL. Static assets are site-relative
 * paths under /public; blob and external assets are stored as absolute URLs.
 * A future storage backend that needs signing or a CDN prefix plugs in here.
 */
export function resolveMedia(row: MediaRow | null | undefined): MediaAsset | null {
  if (!row) return null;
  const src = row.storage === 'static' ? `/${row.src.replace(/^\/+/, '')}` : row.src;
  return {
    src,
    alt: row.alt,
    caption: row.caption || null,
    width: row.width,
    height: row.height,
    mimeType: row.mimeType,
  };
}
