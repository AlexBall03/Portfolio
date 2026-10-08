import 'server-only';
import { del, get, put } from '@vercel/blob';
import { privateBlobEnv } from '@/config/env';

/**
 * Vercel Blob boundary for private documents (resume PDFs). Objects are
 * addressed by pathname, never by URL: a private object's URL is useless
 * without the store's credentials, and neither ever leaves the server. Every
 * read goes through an authorizing Route Handler that streams the bytes.
 */
export interface DocumentStore {
  /** Stores `bytes` at `pathname` (never overwriting). */
  put: (pathname: string, bytes: Uint8Array, contentType: string) => Promise<void>;
  /** Opens a stored object; null when it doesn't exist. */
  get: (pathname: string) => Promise<StoredDocument | null>;
  /** Deletes stored objects. Pathnames outside the known prefixes are ignored. */
  remove: (pathnames: readonly string[]) => Promise<void>;
  /** Whether the private store is configured in this environment. */
  configured: () => boolean;
}

export interface StoredDocument {
  stream: ReadableStream<Uint8Array>;
  size: number;
}

/** Pathname prefixes this app writes to (and therefore may read or delete). */
export const DOCUMENT_PREFIXES = ['resumes/'] as const;

/** True only for a pathname this app could have created: a known prefix, no traversal or URL. */
export function isManagedPathname(pathname: string): boolean {
  return (
    DOCUMENT_PREFIXES.some((p) => pathname.startsWith(p)) &&
    !pathname.includes('..') &&
    !pathname.includes('://') &&
    !pathname.startsWith('/')
  );
}

const credentials = () => privateBlobEnv();

const isConfigured = () => {
  try {
    credentials();
    return true;
  } catch {
    return false;
  }
};

export const privateStore: DocumentStore = {
  async put(pathname, bytes, contentType) {
    if (!isManagedPathname(pathname)) throw new Error(`Refusing to write outside the managed prefixes: ${pathname}`);
    await put(pathname, Buffer.from(bytes), {
      ...credentials(),
      access: 'private',
      contentType,
      addRandomSuffix: false,
      allowOverwrite: false,
    });
  },
  async get(pathname) {
    if (!isManagedPathname(pathname)) return null;
    const result = await get(pathname, { ...credentials(), access: 'private', useCache: false });
    if (!result || result.statusCode !== 200) return null;
    return { stream: result.stream, size: result.blob.size };
  },
  async remove(pathnames) {
    const managed = pathnames.filter(isManagedPathname);
    if (managed.length) await del(managed, credentials());
  },
  configured: isConfigured,
};
