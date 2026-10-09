import { eq } from 'drizzle-orm';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { mediaAssets, profile } from '@/db/schema';
import { content } from '@/db/seed/content';
import { seedContent } from '@/db/seed/seed';
import type { Database } from '@/db/types';
import { ADMIN_ID, OTHER_ID, stubAuthEnv } from '@/test/auth';
import { createTestDb } from '@/test/db';
import { pngBytes, toBytes } from '@/test/images';
import { getProfile } from './repository';

/**
 * The headshot write path end to end, on a real (PGlite) database: Route
 * Handler / Server Action → authorization → validation → service transaction
 * → repository → cache invalidation, with object storage faked.
 */

const session = vi.hoisted(() => ({ userId: null as string | null }));
const tags = vi.hoisted(() => [] as string[]);
const testDb = vi.hoisted(() => ({ db: undefined as unknown }));
const store = vi.hoisted(() => ({ objects: new Map<string, string>(), removed: [] as string[], configured: true }));

vi.mock('@clerk/nextjs/server', () => ({ auth: async () => ({ userId: session.userId }), currentUser: async () => null }));
vi.mock('next/server', () => ({ connection: async () => {} }));
vi.mock('next/navigation', () => ({
  notFound: () => {
    throw new Error('NEXT_HTTP_ERROR_FALLBACK;404');
  },
  unstable_rethrow: () => {},
}));
vi.mock('next/cache', () => ({
  updateTag: (tag: string) => tags.push(tag),
  revalidateTag: (tag: string) => tags.push(tag),
}));
vi.mock('@/db/client', () => ({
  getDb: async () => testDb.db as Database,
  withTransaction: <T,>(run: (tx: Database) => Promise<T>) => (testDb.db as Database).transaction(run),
}));
vi.mock('@/integrations/blob/store', () => ({
  blobStore: {
    configured: () => store.configured,
    put: async (path: string, _bytes: Uint8Array, contentType: string) => {
      const url = `https://store1.public.blob.vercel-storage.com/${path}`;
      store.objects.set(url, contentType);
      return url;
    },
    remove: async (urls: string[]) => {
      for (const url of urls) {
        store.objects.delete(url);
        store.removed.push(url);
      }
    },
  },
}));

const actions = await import('./mutations');
const route = await import('@/app/api/admin/profile/headshot/route');

let db: Database;
let close: () => Promise<void>;

beforeAll(async () => {
  ({ db, close } = await createTestDb());
  testDb.db = db;
  await seedContent(db, content);
}, 60_000);
afterAll(() => close());

beforeEach(() => {
  stubAuthEnv();
  session.userId = ADMIN_ID;
  tags.length = 0;
  store.removed.length = 0;
  store.configured = true;
});

const ORIGIN = 'https://alexball.dev';

function uploadRequest(file: Uint8Array, fields: Record<string, string> = { alt: 'Portrait' }) {
  const form = new FormData();
  form.set('file', new Blob([file as BlobPart], { type: 'image/png' }), 'me.png');
  for (const [k, v] of Object.entries(fields)) form.set(k, v);
  return new Request(`${ORIGIN}/api/admin/profile/headshot`, { method: 'POST', body: form, headers: { origin: ORIGIN, host: 'alexball.dev' } });
}

const upload = (req: Request) => route.POST(req, {});
const headshotId = async () => (await db.select({ id: profile.headshotAssetId }).from(profile))[0]!.id;

describe('headshot', () => {
  it('rejects anyone but the admin as a 404 and stores nothing', async () => {
    session.userId = OTHER_ID;
    expect((await upload(uploadRequest(pngBytes(800, 1000)))).status).toBe(404);
    await expect(actions.removeHeadshot()).rejects.toThrow('404');
    await expect(actions.saveHeadshotText({ alt: 'x' })).rejects.toThrow('404');
    expect(store.objects.size).toBe(0);
  });

  it('replaces the bundled default with an upload, keeps the static file, and refreshes the profile tag', async () => {
    const seeded = await headshotId();
    const res = await upload(uploadRequest(pngBytes(800, 1000)));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.photo).toMatchObject({ width: 800, height: 1000, uploaded: true });
    expect(body.data.photo.src).toMatch(/^https:\/\/store1\.public\.blob\.vercel-storage\.com\/profile\/headshot\/[0-9a-f-]{36}\.png$/);
    expect(tags).toContain('profile');

    const current = await headshotId();
    expect(current).not.toBe(seeded);
    // The seeded static asset row is gone; a static file is never deleted from storage.
    expect(await db.select().from(mediaAssets).where(eq(mediaAssets.id, seeded!))).toEqual([]);
    expect(store.removed).toEqual([]);
    const profile = await getProfile(db);
    expect(profile?.headshot).toMatchObject({ src: body.data.photo.src, alt: 'Portrait' });
  });

  it('deletes the previous uploaded file after a replacement commits', async () => {
    const first = (await (await upload(uploadRequest(pngBytes(10, 10)))).json()).data.photo.src;
    store.removed.length = 0;
    const second = (await (await upload(uploadRequest(pngBytes(20, 20)))).json()).data.photo.src;
    expect(store.removed).toEqual([first]);
    expect(store.objects.has(second)).toBe(true);
  });

  it('accepts only JPEG and PNG (link previews), requires alt text, and stores nothing on failure', async () => {
    const before = store.objects.size;
    const webp = toBytes('RIFF', [0, 0, 0, 0], 'WEBPVP8 ', [0, 0, 0, 0]);
    const wrongType = await upload(uploadRequest(webp));
    expect(wrongType.status).toBe(422);
    expect((await wrongType.json()).fieldErrors.file).toMatch(/JPEG or PNG/);
    const noAlt = await upload(uploadRequest(pngBytes(10, 10), {}));
    expect((await noAlt.json()).fieldErrors.alt).toBeTruthy();
    expect(store.objects.size).toBe(before);
  });

  it('edits alt text on its own', async () => {
    const result = await actions.saveHeadshotText({ alt: 'Alex smiling' });
    expect(result.ok).toBe(true);
    expect((await getProfile(db))?.headshot?.alt).toBe('Alex smiling');
    expect(tags).toContain('profile');
  });

  it('removes the photo and its uploaded file; alt text then needs a new photo', async () => {
    const src = (await (await upload(uploadRequest(pngBytes(10, 10)))).json()).data.photo.src;
    const result = await actions.removeHeadshot();
    expect(result.ok && result.data.photo).toBe(null);
    expect(store.removed).toContain(src);
    expect((await getProfile(db))?.headshot).toBe(null);
    const orphanText = await actions.saveHeadshotText({ alt: 'x' });
    expect(orphanText.ok).toBe(false);
  });

  it('explains when storage is not configured', async () => {
    store.configured = false;
    const res = await upload(uploadRequest(pngBytes(10, 10)));
    expect((await res.json()).fieldErrors.file).toMatch(/not configured/);
  });
});
