import { sql } from 'drizzle-orm';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { resumeVersions } from '@/db/schema';
import type { Database } from '@/db/types';
import { ADMIN_ID, OTHER_ID, stubAuthEnv } from '@/test/auth';
import { createTestDb } from '@/test/db';
import { pngBytes } from '@/test/images';
import { isPdf, safePdfFileName } from '@/lib/pdf-file';
import { findPublishedResume } from './repository';
import type { ResumeAdminValues } from './types';

/**
 * The resume write and delivery paths end to end, on a real (PGlite) database:
 * Route Handler / Server Action → authorization → validation → service →
 * repository → cache invalidation, with the private store faked.
 */

const session = vi.hoisted(() => ({ userId: null as string | null }));
const tags = vi.hoisted(() => [] as string[]);
const testDb = vi.hoisted(() => ({ db: undefined as unknown }));
const store = vi.hoisted(() => ({
  objects: new Map<string, Uint8Array>(),
  removed: [] as string[],
  reads: [] as string[],
  configured: true,
  failRemove: false,
}));

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
  revalidateTag: (tag: string) => tags.push(`${tag}:expire`),
}));
vi.mock('@/db/client', () => ({
  getDb: async () => testDb.db as Database,
  withTransaction: <T,>(run: (tx: Database) => Promise<T>) => (testDb.db as Database).transaction(run),
}));
vi.mock('@/integrations/blob/private-store', () => ({
  privateStore: {
    configured: () => store.configured,
    put: async (pathname: string, bytes: Uint8Array) => {
      if (store.objects.has(pathname)) throw new Error('exists');
      store.objects.set(pathname, bytes);
    },
    get: async (pathname: string) => {
      store.reads.push(pathname);
      const bytes = store.objects.get(pathname);
      return bytes ? { stream: new Blob([bytes as BlobPart]).stream(), size: bytes.byteLength } : null;
    },
    remove: async (pathnames: string[]) => {
      if (store.failRemove) throw new Error('storage down');
      for (const p of pathnames) {
        store.objects.delete(p);
        store.removed.push(p);
      }
    },
  },
}));

const actions = await import('./mutations');
const uploadRoute = await import('@/app/api/admin/resume/route');
const fileRoute = await import('@/app/api/admin/resume/[id]/route');
const publicRoute = await import('@/app/resume.pdf/route');

let db: Database;
let close: () => Promise<void>;

beforeAll(async () => {
  ({ db, close } = await createTestDb());
  testDb.db = db;
}, 60_000);
afterAll(() => close());

beforeEach(async () => {
  stubAuthEnv();
  session.userId = ADMIN_ID;
  tags.length = 0;
  store.objects.clear();
  store.removed.length = 0;
  store.reads.length = 0;
  store.configured = true;
  store.failRemove = false;
  await db.delete(resumeVersions);
});

const ORIGIN = 'https://alexball.dev';

/** A minimal complete PDF: header, some body, trailer. `marker` makes each one distinct. */
const pdf = (marker = 'v1') => new TextEncoder().encode(`%PDF-1.7\n% ${marker}\n${'0'.repeat(200)}\ntrailer\n%%EOF\n`);

function uploadRequest(file: Uint8Array | null, { label = '', name = 'Alex Ball Resume (Fall).pdf', origin = ORIGIN } = {}) {
  const form = new FormData();
  // The declared type is a lie on purpose in some tests: the server must ignore it.
  if (file) form.set('file', new Blob([file as BlobPart], { type: 'application/pdf' }), name);
  form.set('label', label);
  return new Request(`${ORIGIN}/api/admin/resume`, { method: 'POST', body: form, headers: { origin, host: 'alexball.dev' } });
}

async function upload(file: Uint8Array, options?: Parameters<typeof uploadRequest>[1]) {
  const res = await uploadRoute.POST(uploadRequest(file, options), undefined);
  const body = (await res.json()) as { ok: true; data: ResumeAdminValues } | { ok: false; fieldErrors: Record<string, string> };
  return { res, body };
}

async function uploaded(marker: string, label = '') {
  const { body } = await upload(pdf(marker), { label });
  if (!body.ok) throw new Error(JSON.stringify(body));
  return body.data.versions[0]!;
}

const getFile = (id: string, query = '') =>
  fileRoute.GET(new Request(`${ORIGIN}/api/admin/resume/${id}${query}`, { headers: { host: 'alexball.dev' } }), {
    params: Promise.resolve({ id }),
  });

describe('PDF checks', () => {
  it('accepts a complete PDF and rejects anything else, whatever it claims to be', () => {
    expect(isPdf(pdf())).toBe(true);
    expect(isPdf(pngBytes(10, 10))).toBe(false);
    expect(isPdf(new TextEncoder().encode(`<html>${'x'.repeat(100)}%%EOF`))).toBe(false);
    expect(isPdf(pdf().slice(0, 120))).toBe(false); // truncated: no trailer
  });

  it('reduces client file names to a safe download name', () => {
    expect(safePdfFileName('C:\\Users\\me\\Alex Ball Résumé (Fall).PDF')).toBe('Alex-Ball-Resume-Fall.pdf');
    expect(safePdfFileName('"; evil=1.pdf')).toBe('evil-1.pdf');
    expect(safePdfFileName('')).toBe('resume.pdf');
  });
});

describe('authorization', () => {
  it.each([
    ['signed out', null],
    ['another user', OTHER_ID],
  ])('rejects %s as a 404 before validating, writing, or storing anything', async (_case, userId) => {
    session.userId = ADMIN_ID;
    const existing = await uploaded('existing');
    tags.length = 0;
    const before = await db.select().from(resumeVersions);
    const objects = store.objects.size;

    session.userId = userId;
    for (const call of [
      () => actions.publishResumeVersion({ id: existing.id }),
      () => actions.unpublishResume({}),
      () => actions.updateResumeLabel({ id: existing.id, label: 'x' }),
      () => actions.deleteResumeVersion({ id: existing.id }),
    ]) {
      await expect(call()).rejects.toThrow('404');
    }
    expect((await uploadRoute.POST(uploadRequest(pdf('intruder')), undefined)).status).toBe(404);
    const file = await getFile(existing.id);
    expect(file.status).toBe(404);
    expect(file.headers.get('content-type')).toContain('application/json');

    expect(await db.select().from(resumeVersions)).toEqual(before);
    expect(store.objects.size).toBe(objects);
    expect(store.reads).toEqual([]);
    expect(tags).toEqual([]);
  });

  it('refuses a cross-site upload even with the admin session', async () => {
    const { res } = await upload(pdf(), { origin: 'https://evil.example' });
    expect(res.status).toBe(404);
    expect(store.objects.size).toBe(0);
  });
});

describe('uploads', () => {
  it('stores a valid PDF privately, unpublished, with its metadata and author', async () => {
    const { res, body } = await upload(pdf(), { label: '  Fall 2026  ' });
    expect(res.status).toBe(200);
    if (!body.ok) throw new Error('upload failed');
    const [version] = body.data.versions;
    expect(version).toMatchObject({ label: 'Fall 2026', fileName: 'Alex-Ball-Resume-Fall.pdf', isPublished: false, uploadedBy: ADMIN_ID });
    expect(version!.sizeBytes).toBe(pdf().byteLength);

    const [row] = await db.select().from(resumeVersions);
    expect(row!.pathname).toMatch(/^resumes\/[0-9a-f-]{36}\.pdf$/);
    expect(store.objects.has(row!.pathname)).toBe(true);
    // Uploading never publishes.
    expect(await findPublishedResume(db)).toBeNull();
  });

  it('rejects non-PDF bytes sent as application/pdf, and stores nothing', async () => {
    const { res, body } = await upload(pngBytes(20, 20));
    expect(res.status).toBe(422);
    expect(body.ok).toBe(false);
    if (!body.ok) expect(body.fieldErrors.file).toMatch(/not a complete PDF/);
    expect(store.objects.size).toBe(0);
    expect(await db.select().from(resumeVersions)).toEqual([]);
  });

  it('refuses oversized files before reading them', async () => {
    const big = new Uint8Array(4 * 1024 * 1024 + 1);
    big.set(pdf());
    const { res } = await upload(big);
    expect(res.status).toBe(413);
    expect(store.objects.size).toBe(0);
  });

  it('reports missing storage configuration as a field error', async () => {
    store.configured = false;
    const { body } = await upload(pdf());
    expect(body.ok).toBe(false);
    if (!body.ok) expect(body.fieldErrors.file).toMatch(/not configured/);
  });

  it('deletes the stored file again when the database write fails', async () => {
    await db.execute(sql`alter table resume_versions rename to resume_versions_away`);
    try {
      const { body } = await upload(pdf());
      expect(body.ok).toBe(false);
    } finally {
      await db.execute(sql`alter table resume_versions_away rename to resume_versions`);
    }
    expect(store.objects.size).toBe(0);
    expect(store.removed).toHaveLength(1);
  });
});

describe('publication', () => {
  it('keeps exactly one published version, supports older ones, and refreshes the public reads', async () => {
    const a = await uploaded('a', 'A');
    const b = await uploaded('b', 'B');
    tags.length = 0;

    const first = await actions.publishResumeVersion({ id: a.id });
    expect(first.ok).toBe(true);
    expect((await findPublishedResume(db))?.id).toBe(a.id);
    expect(tags).toEqual(['resume']);

    await actions.publishResumeVersion({ id: b.id });
    expect((await findPublishedResume(db))?.id).toBe(b.id);

    // Back to the older version.
    const back = await actions.publishResumeVersion({ id: a.id });
    if (!back.ok) throw new Error('publish failed');
    expect(back.data.versions.filter((v) => v.isPublished).map((v) => v.id)).toEqual([a.id]);
    expect(back.data.versions.find((v) => v.id === a.id)?.publishedAt).not.toBeNull();
  });

  it('leaves the pointer untouched when publishing an unknown version', async () => {
    const a = await uploaded('a');
    await actions.publishResumeVersion({ id: a.id });
    const result = await actions.publishResumeVersion({ id: crypto.randomUUID() });
    expect(result).toMatchObject({ ok: false, formError: expect.stringMatching(/no longer exists/) });
    expect((await findPublishedResume(db))?.id).toBe(a.id);
  });

  it('the database itself refuses a second published row', async () => {
    const a = await uploaded('a');
    const b = await uploaded('b');
    await db.update(resumeVersions).set({ isPublished: true }).where(sql`${resumeVersions.id} = ${a.id}`);
    await expect(db.update(resumeVersions).set({ isPublished: true }).where(sql`${resumeVersions.id} = ${b.id}`)).rejects.toThrow();
  });

  it('unpublishes, leaving none published', async () => {
    const a = await uploaded('a');
    await actions.publishResumeVersion({ id: a.id });
    tags.length = 0;
    expect((await actions.unpublishResume({})).ok).toBe(true);
    expect(await findPublishedResume(db)).toBeNull();
    expect(tags).toEqual(['resume']);
  });

  it('edits a label without touching publication', async () => {
    const a = await uploaded('a', 'Old');
    tags.length = 0;
    const result = await actions.updateResumeLabel({ id: a.id, label: ' ' });
    if (!result.ok) throw new Error('label failed');
    expect(result.data.versions[0]?.label).toBeNull();
    expect(tags).toEqual([]);
  });
});

describe('deletion', () => {
  it('refuses to delete the published version', async () => {
    const a = await uploaded('a');
    await actions.publishResumeVersion({ id: a.id });
    const result = await actions.deleteResumeVersion({ id: a.id });
    expect(result).toMatchObject({ ok: false, fieldErrors: { id: expect.stringMatching(/published resume/) } });
    expect(await db.select().from(resumeVersions)).toHaveLength(1);
    expect(store.removed).toEqual([]);
  });

  it('deletes an unpublished version and its file', async () => {
    const a = await uploaded('a');
    const [row] = await db.select().from(resumeVersions);
    const result = await actions.deleteResumeVersion({ id: a.id });
    expect(result.ok).toBe(true);
    expect(await db.select().from(resumeVersions)).toEqual([]);
    expect(store.removed).toEqual([row!.pathname]);
  });

  it('still succeeds when the file cannot be deleted (logged as an orphan)', async () => {
    const a = await uploaded('a');
    store.failRemove = true;
    vi.spyOn(console, 'error').mockImplementation(() => {});
    expect((await actions.deleteResumeVersion({ id: a.id })).ok).toBe(true);
    expect(await db.select().from(resumeVersions)).toEqual([]);
  });
});

describe('delivery', () => {
  it('serves any version to the admin, privately, inline or as a download', async () => {
    const a = await uploaded('a');
    const res = await getFile(a.id);
    expect(res.status).toBe(200);
    expect(res.headers.get('content-type')).toBe('application/pdf');
    expect(res.headers.get('content-disposition')).toBe('inline; filename="Alex-Ball-Resume-Fall.pdf"');
    expect(res.headers.get('cache-control')).toBe('private, no-store');
    expect(res.headers.get('x-content-type-options')).toBe('nosniff');
    expect(new Uint8Array(await res.arrayBuffer())).toEqual(pdf('a'));

    expect((await getFile(a.id, '?download=1')).headers.get('content-disposition')).toMatch(/^attachment;/);
  });

  it('fails safely for invalid, unknown, deleted, or missing-file versions', async () => {
    expect((await getFile('not-a-uuid')).status).toBe(404);
    expect((await getFile(crypto.randomUUID())).status).toBe(404);
    const a = await uploaded('a');
    store.objects.clear();
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    expect((await getFile(a.id)).status).toBe(404);
    await actions.deleteResumeVersion({ id: a.id });
    expect((await getFile(a.id)).status).toBe(404);
  });

  it('serves only the published version publicly', async () => {
    expect((await publicRoute.GET()).status).toBe(404);

    const a = await uploaded('a');
    const b = await uploaded('b');
    // Uploads alone expose nothing.
    expect((await publicRoute.GET()).status).toBe(404);

    await actions.publishResumeVersion({ id: a.id });
    let res = await publicRoute.GET();
    expect(res.status).toBe(200);
    expect(res.headers.get('cache-control')).toMatch(/^public/);
    expect(res.headers.get('content-disposition')).toMatch(/^inline;/);
    expect(new Uint8Array(await res.arrayBuffer())).toEqual(pdf('a'));

    await actions.publishResumeVersion({ id: b.id });
    res = await publicRoute.GET();
    expect(new Uint8Array(await res.arrayBuffer())).toEqual(pdf('b'));

    await actions.unpublishResume({});
    expect((await publicRoute.GET()).status).toBe(404);
  });
});
