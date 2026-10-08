import 'server-only';
import { del, put } from '@vercel/blob';
import { blobEnv } from '@/config/env';

/**
 * Vercel Blob boundary for public media. Callers never choose URLs to delete
 * freely or pass client paths through: object paths are built by the domain
 * service, and only URLs on a Vercel Blob public host under a known prefix
 * are ever deleted.
 */
export interface MediaStore {
  /** Stores `bytes` at `path` (never overwriting) and returns its public URL. */
  put: (path: string, bytes: Uint8Array, contentType: string) => Promise<string>;
  /** Deletes stored objects by URL. Unknown or foreign URLs are ignored. */
  remove: (urls: readonly string[]) => Promise<void>;
  /** Whether storage is configured in this environment. */
  configured: () => boolean;
}

/** Object path prefixes this app writes to (and therefore may delete from). */
export const MEDIA_PREFIXES = ['projects/'] as const;

const BLOB_HOST = /^[a-z0-9]+\.public\.blob\.vercel-storage\.com$/i;

/** True only for a URL this app could have created: https, a public Blob host, a known prefix. */
export function isManagedBlobUrl(url: string): boolean {
  try {
    const u = new URL(url);
    const path = u.pathname.replace(/^\/+/, '');
    return u.protocol === 'https:' && BLOB_HOST.test(u.hostname) && MEDIA_PREFIXES.some((p) => path.startsWith(p));
  } catch {
    return false;
  }
}

const isConfigured = () => {
  try {
    blobEnv();
    return true;
  } catch {
    return false;
  }
};

export const blobStore: MediaStore = {
  async put(path, bytes, contentType) {
    blobEnv();
    // Names are unique (server-generated UUIDs), so the object never changes:
    // cache it for a year and refuse to overwrite.
    const result = await put(path, Buffer.from(bytes), {
      access: 'public',
      contentType,
      addRandomSuffix: false,
      allowOverwrite: false,
      cacheControlMaxAge: 60 * 60 * 24 * 365,
    });
    return result.url;
  },
  async remove(urls) {
    const managed = urls.filter(isManagedBlobUrl);
    if (managed.length) await del(managed);
  },
  configured: isConfigured,
};
