import { eq } from 'drizzle-orm';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { mediaAssets, projectMedia, projects } from '@/db/schema';
import { content } from '@/db/seed/content';
import { seedContent } from '@/db/seed/seed';
import type { Database } from '@/db/types';
import { ADMIN_ID, OTHER_ID, stubAuthEnv } from '@/test/auth';
import { createTestDb } from '@/test/db';
import { pngBytes, toBytes } from '@/test/images';
import { findProjectBySlug, listPublishedProjects, listPublishedProjectSlugs } from './repository';
import type { ProjectValues } from './types';

/**
 * The project admin write path end to end, on a real (PGlite) database:
 * Server Action / Route Handler → authorization → validation → service
 * transaction → repository → cache invalidation, with object storage faked.
 */

const session = vi.hoisted(() => ({ userId: null as string | null }));
const tags = vi.hoisted(() => [] as string[]);
const testDb = vi.hoisted(() => ({ db: undefined as unknown }));
const store = vi.hoisted(() => ({
  objects: new Map<string, string>(),
  removed: [] as string[],
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
  revalidateTag: (tag: string, profile: unknown) => tags.push(`${tag}:${JSON.stringify(profile)}`),
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
      if (store.failRemove) throw new Error('storage down');
      for (const url of urls) {
        store.objects.delete(url);
        store.removed.push(url);
      }
    },
  },
}));

const actions = await import('./mutations');
const service = await import('./service');
const uploadRoute = await import('@/app/api/admin/projects/[id]/media/route');
const replaceRoute = await import('@/app/api/admin/projects/[id]/media/[assetId]/route');

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
  store.failRemove = false;
});

const ORIGIN = 'https://alexball.dev';

function draft(slug: string, patch: Partial<ProjectValues> = {}): ProjectValues {
  const values = service.blankProject();
  values.slug = slug;
  Object.assign(values, { name: `Project ${slug}`, tagline: 'A tagline', summary: 'A summary.', body: ['More.', ''] });
  values.technologies = [
    { key: 'typescript', slug: 'typescript', name: 'TypeScript' },
    { key: 'new-tech', slug: 'brand-new-tech', name: 'Brand New Tech' },
  ];
  return { ...values, ...patch };
}

async function create(slug: string, patch: Partial<ProjectValues> = {}) {
  const result = await actions.createProject(draft(slug, patch));
  if (!result.ok) throw new Error(JSON.stringify(result));
  return result.data;
}

function uploadRequest(projectId: string, file: Uint8Array | null, fields: Record<string, string> = { alt: 'Screenshot' }, origin = ORIGIN) {
  const form = new FormData();
  if (file) form.set('file', new Blob([file as BlobPart], { type: 'image/png' }), 'shot.png');
  for (const [k, v] of Object.entries(fields)) form.set(k, v);
  return new Request(`${ORIGIN}/api/admin/projects/${projectId}/media`, {
    method: 'POST',
    body: form,
    headers: { origin, host: 'alexball.dev' },
  });
}

const upload = (projectId: string, req: Request) => uploadRoute.POST(req, { params: Promise.resolve({ id: projectId }) });
const replace = (projectId: string, assetId: string, file: Uint8Array) => {
  const form = new FormData();
  form.set('file', new Blob([file as BlobPart]), 'x.png');
  return replaceRoute.PUT(
    new Request(`${ORIGIN}/api/admin/projects/${projectId}/media/${assetId}`, {
      method: 'PUT',
      body: form,
      headers: { origin: ORIGIN, host: 'alexball.dev' },
    }),
    { params: Promise.resolve({ id: projectId, assetId }) },
  );
};

describe('authorization', () => {
  it.each([
    ['signed out', null],
    ['another user', OTHER_ID],
  ])('rejects %s as a 404 before validating, writing, or storing anything', async (_case, userId) => {
    const target = (await service.loadProjectList())[0]!;
    const before = await db.select().from(projects);
    session.userId = userId;
    for (const call of [
      () => actions.createProject(draft('intruder')),
      () => actions.saveProject({ ...draft('intruder'), id: target.id }),
      () => actions.deleteProject({ id: target.id, confirmSlug: target.slug }),
      () => actions.saveProjectOrder({ featured: [], other: [] }),
      () => actions.saveProjectMedia({ projectId: target.id, items: [] }),
    ]) {
      await expect(call()).rejects.toThrow('404');
    }
    const res = await upload(target.id, uploadRequest(target.id, pngBytes(10, 10)));
    expect(res.status).toBe(404);
    expect(await db.select().from(projects)).toEqual(before);
    expect(store.objects.size).toBe(0);
    expect(tags).toEqual([]);
  });

  it('refuses a cross-site upload even with the admin session', async () => {
    const target = (await service.loadProjectList())[0]!;
    const res = await upload(target.id, uploadRequest(target.id, pngBytes(10, 10), undefined, 'https://evil.example'));
    expect(res.status).toBe(404);
    expect(store.objects.size).toBe(0);
  });
});

describe('drafts and publishing', () => {
  it('creates a draft that the public site never shows, but the preview does', async () => {
    const saved = await create('secret-draft');
    expect(saved).toMatchObject({ status: 'draft', publishedAt: null });
    expect(saved.body).toEqual(['More.']);
    expect(tags).toEqual(['projects']);

    expect((await listPublishedProjects(db)).some((p) => p.slug === 'secret-draft')).toBe(false);
    expect(await listPublishedProjectSlugs(db)).not.toContain('secret-draft');
    expect(await findProjectBySlug(db, 'secret-draft')).toEqual({ kind: 'not-found' });
    expect((await service.loadProjectPreview(saved.id!))?.name).toBe('Project secret-draft');

    const [row] = await db.select().from(projects).where(eq(projects.id, saved.id!));
    expect(row).toMatchObject({ createdBy: ADMIN_ID, updatedBy: ADMIN_ID });
    // New projects go to the end of the editorial order.
    const list = await service.loadProjectList();
    expect(list.at(-1)?.id).toBe(saved.id);
  });

  it('publishes (stamping published_at), updates live content, then unpublishes', async () => {
    const saved = await create('going-live');
    const published = await actions.saveProject({ ...saved, status: 'published' });
    expect(published.ok && published.data.status).toBe('published');
    const publishedAt = published.ok ? published.data.publishedAt : null;
    expect(publishedAt).toEqual(expect.any(String));
    expect(await findProjectBySlug(db, 'going-live')).toMatchObject({ kind: 'found' });

    const edited = await actions.saveProject({
      ...saved,
      status: 'published',
      tagline: 'Now live',
    });
    expect(edited.ok && edited.data.publishedAt).toBe(publishedAt); // a plain save keeps the timestamp
    const live = await findProjectBySlug(db, 'going-live');
    expect(live.kind === 'found' && live.project.tagline).toBe('Now live');

    const unpublished = await actions.saveProject({ ...saved, status: 'draft' });
    expect(unpublished.ok).toBe(true);
    expect(await findProjectBySlug(db, 'going-live')).toEqual({ kind: 'not-found' });
    expect(tags).toEqual(['projects', 'projects', 'projects', 'projects']);
  });

  it('retires the old slug of a public project as a redirect', async () => {
    const saved = await create('old-name', { status: 'published' });
    const renamed = await actions.saveProject({ ...saved, slug: 'new-name' });
    expect(renamed.ok).toBe(true);
    expect(await findProjectBySlug(db, 'old-name')).toEqual({ kind: 'redirect', slug: 'new-name' });

    // The retired slug stays reserved for this project…
    const clash = await actions.createProject(draft('old-name'));
    expect(!clash.ok && clash.fieldErrors).toEqual({ slug: 'Another project uses (or used) this URL' });
    // …which may take it back.
    const back = await actions.saveProject({ ...(renamed.ok ? renamed.data : saved), slug: 'old-name' });
    expect(back.ok).toBe(true);
    expect(await findProjectBySlug(db, 'old-name')).toMatchObject({ kind: 'found' });
  });

  it('reports a slug used by another project as a field error', async () => {
    const result = await actions.createProject(draft('weather'));
    expect(!result.ok && result.fieldErrors).toEqual({ slug: 'Another project uses (or used) this URL' });
    expect(tags).toEqual([]);
  });
});

describe('validation and content', () => {
  it('reports invalid input by path and writes nothing', async () => {
    const before = await db.select().from(projects);
    const values = draft('Bad Slug!', { demoUrl: 'javascript:alert(1)' });
    values.name = '';
    const result = await actions.createProject(values);
    expect(!result.ok && Object.keys(result.fieldErrors).sort()).toEqual(['demoUrl', 'name', 'slug']);
    expect(await db.select().from(projects)).toEqual(before);
  });

  it('stores the copy on the project row and serves edits', async () => {
    const saved = await create('english-only', { status: 'published' });
    const [row] = await db.select().from(projects).where(eq(projects.id, saved.id!));
    expect(row).toMatchObject({ name: 'Project english-only', tagline: 'A tagline', summary: 'A summary.', body: ['More.'] });

    const edited = await actions.saveProject({ ...saved, name: 'Renamed project', body: [] });
    expect(edited.ok).toBe(true);
    const live = await findProjectBySlug(db, 'english-only');
    expect(live.kind === 'found' && live.project).toMatchObject({ name: 'Renamed project', body: [] });
    expect((await service.loadProjectList()).find((p) => p.id === saved.id)?.name).toBe('Renamed project');
  });

  it('adds new technologies to the shared vocabulary in order', async () => {
    const saved = await create('with-tech', { status: 'published' });
    expect(saved.technologies.map((t) => t.slug)).toEqual(['typescript', 'brand-new-tech']);
    expect((await service.loadTechnologies()).some((t) => t.slug === 'brand-new-tech')).toBe(true);
  });
});

describe('ordering and featured', () => {
  it('saves an explicit order, featured first, and the public list follows it', async () => {
    const order = await service.loadProjectOrder();
    const all = [...order.featured, ...order.other];
    const weather = all.find((p) => p.slug === 'weather')!;
    const portfolio = all.find((p) => p.slug === 'portfolio')!;
    const english = all.find((p) => p.slug === 'english-only')!;
    const rest = all.filter((p) => ![weather.id, portfolio.id, english.id].includes(p.id));

    const result = await actions.saveProjectOrder({
      featured: [english, portfolio],
      other: [weather, ...rest],
    });
    expect(result.ok).toBe(true);
    expect(tags).toEqual(['projects']);
    expect(result.ok && result.data.featured.map((p) => p.slug)).toEqual(['english-only', 'portfolio']);

    const publicList = await listPublishedProjects(db);
    expect(publicList.filter((p) => p.featured).map((p) => p.slug)).toEqual(['english-only', 'portfolio']);
    expect(publicList.find((p) => p.slug === 'weather')?.featured).toBe(false);
    const sorted = await db.select({ slug: projects.slug, sortOrder: projects.sortOrder }).from(projects);
    const position = (slug: string) => sorted.find((p) => p.slug === slug)!.sortOrder;
    expect(position('english-only')).toBeLessThan(position('portfolio'));
    expect(position('portfolio')).toBeLessThan(position('weather'));
  });

  it('rejects a project listed twice', async () => {
    const { featured } = await service.loadProjectOrder();
    const result = await actions.saveProjectOrder({ featured: [featured[0]!, featured[0]!], other: [] });
    expect(result.ok).toBe(false);
  });
});

describe('images', () => {
  it('uploads a checked image to a server-chosen path; the first becomes the hero', async () => {
    const project = await create('gallery', { status: 'published' });
    tags.length = 0;
    const res = await upload(project.id!, uploadRequest(project.id!, pngBytes(1600, 900), { alt: 'Dashboard', caption: 'Main view' }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
    const [item] = body.data.items;
    expect(item).toMatchObject({ isCover: true, width: 1600, height: 900 });
    expect(item.src).toMatch(new RegExp(`^https://store1\\.public\\.blob\\.vercel-storage\\.com/projects/${project.id}/[0-9a-f-]{36}\\.png$`));
    expect(store.objects.get(item.src)).toBe('image/png');
    expect(tags).toEqual(['projects:{"expire":0}']);

    const live = await findProjectBySlug(db, 'gallery');
    expect(live.kind === 'found' && live.project.cover).toMatchObject({ alt: 'Dashboard', caption: 'Main view', src: item.src });

    const [asset] = await db.select().from(mediaAssets).where(eq(mediaAssets.id, item.assetId));
    expect(asset).toMatchObject({ storage: 'blob', createdBy: ADMIN_ID });
  });

  it('rejects files by their bytes, not their name or declared type', async () => {
    const project = (await service.loadProjectList()).find((p) => p.slug === 'gallery')!;
    const html = toBytes('<!doctype html><script>alert(1)</script>');
    const res = await upload(project.id, uploadRequest(project.id, html));
    expect(res.status).toBe(422);
    expect((await res.json()).fieldErrors).toEqual({ file: 'Use a JPEG, PNG, WebP, or AVIF image' });

    const huge = new Uint8Array(4 * 1024 * 1024 + 1);
    huge.set(pngBytes(10, 10));
    expect((await upload(project.id, uploadRequest(project.id, huge))).status).toBe(413);

    const noAlt = await upload(project.id, uploadRequest(project.id, pngBytes(10, 10), {}));
    expect((await noAlt.json()).fieldErrors).toEqual({ alt: expect.any(String) });
    expect(store.objects.size).toBe(1); // only the earlier upload
  });

  it('answers unknown projects and malformed ids without storing anything', async () => {
    const missing = '00000000-0000-4000-8000-000000000000';
    const res = await upload(missing, uploadRequest(missing, pngBytes(10, 10)));
    expect(res.status).toBe(422);
    expect((await upload('../../etc', uploadRequest('x', pngBytes(10, 10)))).status).toBe(404);
    expect(store.objects.size).toBe(1);
  });

  it('reports missing storage configuration instead of failing', async () => {
    const project = (await service.loadProjectList()).find((p) => p.slug === 'gallery')!;
    store.configured = false;
    const res = await upload(project.id, uploadRequest(project.id, pngBytes(10, 10)));
    expect((await res.json()).fieldErrors.file).toMatch(/not configured/);
  });

  it('removes the stored file again when the database write fails', async () => {
    const project = (await service.loadProjectList()).find((p) => p.slug === 'gallery')!;
    const before = new Set(store.objects.keys());
    const spy = vi.spyOn(db, 'transaction').mockRejectedValueOnce(new Error('db down'));
    const res = await upload(project.id, uploadRequest(project.id, pngBytes(10, 10)));
    spy.mockRestore();
    expect((await res.json()).formError).toMatch(/Saving failed/);
    expect(store.removed).toHaveLength(1);
    expect(new Set(store.objects.keys())).toEqual(before);
  });

  it('replaces a file in place and deletes the old one after the save', async () => {
    const project = (await service.loadProjectList()).find((p) => p.slug === 'gallery')!;
    const [before] = (await service.loadProjectMedia(project.id))!.items;
    const res = await replace(project.id, before!.assetId, pngBytes(800, 600));
    const body = await res.json();
    expect(body.ok).toBe(true);
    const [after] = body.data.items;
    expect(after).toMatchObject({ assetId: before!.assetId, isCover: true, width: 800, alt: before!.alt, caption: before!.caption });
    expect(after.src).not.toBe(before!.src);
    expect(store.removed).toEqual([before!.src]);

    const foreign = (await service.loadProjectList()).find((p) => p.slug === 'weather')!;
    expect((await (await replace(foreign.id, before!.assetId, pngBytes(5, 5))).json()).ok).toBe(false);
  });

  it('saves order, hero, and text; removed images are deleted from storage after commit', async () => {
    const project = (await service.loadProjectList()).find((p) => p.slug === 'gallery')!;
    await upload(project.id, uploadRequest(project.id, pngBytes(20, 20), { alt: 'Second' }));
    await upload(project.id, uploadRequest(project.id, pngBytes(30, 30), { alt: 'Third' }));
    const { items } = (await service.loadProjectMedia(project.id))!;
    expect(items.map((i) => i.isCover)).toEqual([true, false, false]);
    const [first, second, third] = items;
    tags.length = 0;

    const twoHeroes = await actions.saveProjectMedia({
      projectId: project.id,
      items: [{ ...third!, isCover: true }, { ...second!, isCover: true }],
    });
    expect(twoHeroes.ok).toBe(false);

    const result = await actions.saveProjectMedia({
      projectId: project.id,
      items: [
        { ...third!, isCover: true, alt: 'Third, now the hero' },
        second!,
      ],
    });
    expect(result.ok).toBe(true);
    expect(tags).toEqual(['projects']);
    expect(store.removed).toEqual([first!.src]);
    expect(await db.select().from(mediaAssets).where(eq(mediaAssets.id, first!.assetId))).toEqual([]);

    const live = await findProjectBySlug(db, 'gallery');
    expect(live.kind === 'found' && live.project.cover?.alt).toBe('Third, now the hero');
    expect(live.kind === 'found' && live.project.gallery.map((g) => g.alt)).toEqual(['Second']);
  });

  it('keeps the save when storage cleanup fails (logged, not thrown)', async () => {
    const project = (await service.loadProjectList()).find((p) => p.slug === 'gallery')!;
    const { items } = (await service.loadProjectMedia(project.id))!;
    store.failRemove = true;
    const errorLog = vi.spyOn(console, 'error').mockImplementation(() => {});
    const result = await actions.saveProjectMedia({ projectId: project.id, items: items.slice(0, 1) });
    errorLog.mockRestore();
    expect(result.ok).toBe(true);
    expect((await service.loadProjectMedia(project.id))!.items).toHaveLength(1);
  });
});

describe('delete', () => {
  it('requires the slug to be repeated', async () => {
    const project = (await service.loadProjectList()).find((p) => p.slug === 'gallery')!;
    const result = await actions.deleteProject({ id: project.id, confirmSlug: 'weather' });
    expect(!result.ok && result.fieldErrors).toEqual({ confirmSlug: 'Type "gallery" to confirm' });
    expect(await service.loadProject(project.id)).not.toBeNull();
  });

  it('deletes the project, its links and its own images, then the stored files', async () => {
    const project = (await service.loadProjectList()).find((p) => p.slug === 'gallery')!;
    const { items } = (await service.loadProjectMedia(project.id))!;
    const result = await actions.deleteProject({ id: project.id, confirmSlug: 'gallery' });
    expect(result.ok).toBe(true);
    expect(tags).toEqual(['projects']);
    expect(await service.loadProject(project.id)).toBeNull();
    expect(await db.select().from(projectMedia).where(eq(projectMedia.projectId, project.id))).toEqual([]);
    expect(store.removed).toEqual(items.map((i) => i.src));
    expect(await findProjectBySlug(db, 'gallery')).toEqual({ kind: 'not-found' });
  });
});
