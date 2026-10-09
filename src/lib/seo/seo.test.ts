import { eq } from 'drizzle-orm';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { absoluteMediaUrl, shareCardUrl } from '@/config/site';
import { projects, projectSlugHistory } from '@/db/schema';
import { content } from '@/db/seed/content';
import { seedContent } from '@/db/seed/seed';
import type { Database } from '@/db/types';
import type { Profile } from '@/features/profile/types';
import { listPublishedProjectSitemap } from '@/features/projects/repository';
import type { Project } from '@/features/projects/types';
import { createTestDb } from '@/test/db';
import { pageMetadata } from './metadata';
import { cardFingerprint, type CardSpec } from './share-card/inputs';
import { sitemapEntries } from './sitemap';
import { buildPageNode, buildProject, buildSiteGraph } from './structured-data';

const BLOB = 'https://abc123.public.blob.vercel-storage.com/profile/headshot/photo.jpg';

const profile: Profile = {
  fullName: 'Alexander Ball',
  shortName: 'Alex',
  email: 'hello@example.com',
  openToWork: true,
  timeZone: 'America/New_York',
  addressRegion: 'FL',
  addressCountry: 'US',
  headshot: { src: BLOB, alt: 'Portrait', caption: null, width: 800, height: 1000, mimeType: 'image/jpeg' },
  title: 'Software Engineer',
  statement: 'Builds things.',
  availabilityText: 'Open to work',
  locationLabel: 'Florida',
  about: [],
  hero: { focus: 'Full stack', stackLine: 'TypeScript', chips: [] },
};

const project: Project = {
  id: 'p1',
  slug: 'my-app',
  name: 'My App',
  tagline: 'A tagline',
  summary: 'A summary',
  body: [],
  featured: true,
  isLive: true,
  links: { demo: 'https://demo.example.com', source: null, details: null },
  technologies: [{ slug: 'typescript', name: 'TypeScript' }],
  repositories: [
    { provider: 'github', githubId: 2, owner: 'a', name: 'docs', url: 'https://github.com/a/docs', label: null, isPrimary: false },
    { provider: 'github', githubId: 1, owner: 'a', name: 'app', url: 'https://github.com/a/app', label: null, isPrimary: true },
  ],
  githubAnalytics: false,
  cover: { src: '/assets/projects/my-app.png', alt: '', caption: null, width: 1600, height: 1000, mimeType: 'image/png' },
  gallery: [],
};

describe('pageMetadata', () => {
  const meta = pageMetadata({
    path: '/about',
    title: 'About',
    description: 'Description',
    siteName: 'Alexander Ball',
    shareVersion: 'abc',
  });

  it('has one canonical URL and no language alternates', () => {
    expect(meta.alternates).toEqual({ canonical: 'https://alexball.dev/about' });
  });

  it('sets the site name and English locale on Open Graph (the layout value is replaced, not merged)', () => {
    expect(meta.openGraph).toMatchObject({
      siteName: 'Alexander Ball',
      url: 'https://alexball.dev/about',
      locale: 'en_US',
      title: 'About — Alexander Ball',
    });
    expect(meta.openGraph).not.toHaveProperty('alternateLocale');
  });

  it('uses the versioned share card for Open Graph and Twitter', () => {
    const url = 'https://alexball.dev/og/about.png?v=abc';
    expect(meta.openGraph?.images).toEqual([
      { url, width: 1200, height: 630, alt: 'About — Alexander Ball', type: 'image/png' },
    ]);
    expect(meta.twitter).toMatchObject({ card: 'summary_large_image', images: [{ url, width: 1200, height: 630 }] });
  });

  it('keeps an absolute (home) title as the social title', () => {
    const home = pageMetadata({ path: '/', title: 'A — B', description: 'd', siteName: 'A', absoluteTitle: true });
    expect(home.title).toEqual({ absolute: 'A — B' });
    expect(home.openGraph?.title).toBe('A — B');
    expect(home.alternates).toEqual({ canonical: 'https://alexball.dev/' });
    expect(shareCardUrl('/')).toBe('https://alexball.dev/og/home.png');
  });
});

describe('structured data', () => {
  it('never prefixes an uploaded (absolute) headshot with the site URL', () => {
    const graph = buildSiteGraph({ profile, socials: [], experiences: [], skills: { stack: [], learning: [] } });
    const [person] = graph['@graph'] as [Record<string, unknown>];
    expect(person.image).toBe(BLOB);
    expect(absoluteMediaUrl('/assets/headshot.jpg')).toBe('https://alexball.dev/assets/headshot.jpg');
  });

  it('describes a project with its canonical URL, cover, primary repository, and author', () => {
    expect(buildProject(project)).toEqual({
      '@type': 'SoftwareSourceCode',
      '@id': 'https://alexball.dev/projects/my-app#project',
      name: 'My App',
      description: 'A summary',
      url: 'https://alexball.dev/projects/my-app',
      inLanguage: 'en',
      image: 'https://alexball.dev/assets/projects/my-app.png',
      codeRepository: 'https://github.com/a/app',
      programmingLanguage: ['TypeScript'],
      author: { '@id': 'https://alexball.dev/#person' },
    });
  });

  it('builds English page nodes, omitting absent facts', () => {
    const node = buildPageNode({ type: 'ContactPage', path: '/contact', name: 'Contact', description: null });
    expect(node).toMatchObject({ '@id': 'https://alexball.dev/contact#webpage', inLanguage: 'en' });
    expect(node).not.toHaveProperty('description');
  });
});

describe('sitemapEntries', () => {
  const entries = sitemapEntries([
    { slug: 'older', updatedAt: '2026-01-01T00:00:00.000Z' },
    { slug: 'newer', updatedAt: '2026-05-01T00:00:00.000Z' },
  ]);
  const byUrl = new Map(entries.map((e) => [e.url, e]));

  it('lists every page and project once, at its canonical English URL', () => {
    expect(entries.map((e) => e.url)).toEqual([
      'https://alexball.dev/',
      'https://alexball.dev/about',
      'https://alexball.dev/projects',
      'https://alexball.dev/experience',
      'https://alexball.dev/resume',
      'https://alexball.dev/contact',
      'https://alexball.dev/projects/older',
      'https://alexball.dev/projects/newer',
    ]);
    expect(entries.every((e) => e.alternates === undefined)).toBe(true);
  });

  it('uses real timestamps only, and no arbitrary priority', () => {
    expect(byUrl.get('https://alexball.dev/projects/older')?.lastModified).toBe('2026-01-01T00:00:00.000Z');
    expect(byUrl.get('https://alexball.dev/projects')?.lastModified).toBe('2026-05-01T00:00:00.000Z');
    expect(byUrl.get('https://alexball.dev/about')).not.toHaveProperty('lastModified');
    expect(entries.every((e) => e.priority === undefined && e.changeFrequency === undefined)).toBe(true);
  });
});

describe('share-card fingerprint', () => {
  const base: CardSpec = {
    kind: 'page',
    image: profile.headshot,
    props: {
      index: '01',
      label: 'About',
      title: 'About me',
      description: 'd',
      brandMark: 'AB',
      domain: 'alexball.dev',
      fullName: 'Alexander Ball',
      role: 'Engineer',
      availability: null,
    },
  };

  it('is stable for the same content and changes with any shown field or image', () => {
    expect(cardFingerprint(base)).toBe(cardFingerprint(structuredClone(base)));
    const changed = [
      { ...base, props: { ...base.props, title: 'About' } },
      { ...base, props: { ...base.props, brandMark: 'A.' } },
      { ...base, image: { ...profile.headshot!, src: `${BLOB}?2` } },
      { ...base, image: null },
    ];
    for (const spec of changed) expect(cardFingerprint(spec)).not.toBe(cardFingerprint(base));
    // Alt text isn't drawn on the card.
    expect(cardFingerprint({ ...base, image: { ...profile.headshot!, alt: 'Other' } })).toBe(cardFingerprint(base));
  });
});

describe('listPublishedProjectSitemap (PGlite)', () => {
  let db: Database;
  let close: () => Promise<void>;

  beforeAll(async () => {
    ({ db, close } = await createTestDb());
    await seedContent(db, content);
  }, 60_000);
  afterAll(() => close());

  it('lists only published projects, by current slug, with a timestamp', async () => {
    const all = await db.select({ id: projects.id, slug: projects.slug }).from(projects);
    expect(all.length).toBeGreaterThan(1);
    const [draft, archived] = all as [(typeof all)[number], ...typeof all];
    await db.update(projects).set({ status: 'draft' }).where(eq(projects.id, draft.id));
    if (archived) await db.update(projects).set({ status: 'archived' }).where(eq(projects.id, archived.id));
    await db.insert(projectSlugHistory).values({ slug: 'retired-slug', projectId: all.at(-1)!.id });

    const rows = await listPublishedProjectSitemap(db);
    const slugs = rows.map((r) => r.slug);
    expect(slugs).not.toContain(draft.slug);
    if (archived) expect(slugs).not.toContain(archived.slug);
    expect(slugs).not.toContain('retired-slug');
    expect(rows.every((r) => r.updatedAt instanceof Date && !Number.isNaN(r.updatedAt.getTime()))).toBe(true);
  });
});
