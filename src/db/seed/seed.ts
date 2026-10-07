import { sql } from 'drizzle-orm';
import * as s from '../schema';
import type { Database } from '../types';
import type { Locale } from '../../i18n/config';
import type { MediaInput } from '../../lib/validation';
import { contentSeedSchema, type ContentSeed } from './schema';

/** Tables owned by the content seed, in an order safe to TRUNCATE ... CASCADE. */
const CONTENT_TABLES = [
  s.projectMedia,
  s.projectRepositories,
  s.projectTechnologies,
  s.projectSlugHistory,
  s.projectTranslations,
  s.projects,
  s.skillCategoryTechnologies,
  s.skillCategoryTranslations,
  s.skillCategories,
  s.technologies,
  s.experienceTranslations,
  s.experiences,
  s.snapshotMetricTranslations,
  s.snapshotMetrics,
  s.profileHighlightTranslations,
  s.profileHighlights,
  s.profileRoleTranslations,
  s.profileRoles,
  s.socialLinks,
  s.profileTranslations,
  s.profile,
  s.sectionContent,
  s.pageContent,
  s.siteSettings,
  s.mediaAssetTranslations,
  s.mediaAssets,
];

/** Expands a `{ en, es? }` translation object into rows for the locales present. */
function rows<T extends object, Extra extends object>(
  translations: Partial<Record<Locale, T>>,
  extra: Extra,
): (T & Extra & { locale: Locale })[] {
  return (Object.entries(translations) as [Locale, T | undefined][])
    .filter((entry): entry is [Locale, T] => entry[1] !== undefined)
    .map(([locale, t]) => ({ ...t, ...extra, locale }));
}

export type SeedResult = { status: 'seeded' } | { status: 'skipped'; reason: string };

/**
 * Loads a content document into an empty database inside one transaction.
 * Refuses to touch a database that already has content unless `force` is set,
 * in which case all content tables are cleared first. It never runs implicitly.
 */
export async function seedContent(
  db: Database,
  input: unknown,
  { force = false }: { force?: boolean } = {},
): Promise<SeedResult> {
  const doc: ContentSeed = contentSeedSchema.parse(input);

  return db.transaction(async (tx) => {
    const [existing] = await tx.select({ id: s.siteSettings.id }).from(s.siteSettings).limit(1);
    if (existing && !force) {
      return { status: 'skipped', reason: 'Database already contains content (use --force to reset it).' };
    }
    if (existing) {
      const names = CONTENT_TABLES.map((t) => sql`${t}`);
      await tx.execute(sql`TRUNCATE ${sql.join(names, sql`, `)} CASCADE`);
    }

    const insertMedia = async (media: MediaInput | null | undefined) => {
      if (!media) return null;
      const [asset] = await tx
        .insert(s.mediaAssets)
        .values({
          storage: media.storage,
          src: media.src,
          mimeType: media.mimeType ?? null,
          width: media.width ?? null,
          height: media.height ?? null,
        })
        .returning({ id: s.mediaAssets.id });
      if (!asset) throw new Error('Failed to insert media asset');
      const alt: Partial<Record<Locale, { alt: string }>> = {};
      for (const [locale, text] of Object.entries(media.alt) as [Locale, string | undefined][]) {
        if (text) alt[locale] = { alt: text };
      }
      await tx.insert(s.mediaAssetTranslations).values(rows(alt, { assetId: asset.id }));
      return asset.id;
    };

    // Site settings and page copy
    await tx.insert(s.siteSettings).values({ id: 1, ...doc.settings });
    for (const [pageKey, translations] of Object.entries(doc.pages)) {
      await tx.insert(s.pageContent).values(rows(translations, { pageKey: pageKey as keyof typeof doc.pages }));
    }
    for (const [sectionKey, translations] of Object.entries(doc.sections)) {
      await tx
        .insert(s.sectionContent)
        .values(rows(translations, { sectionKey: sectionKey as keyof typeof doc.sections }));
    }

    // Profile
    const { headshot, resume, translations: profileTranslations, ...profile } = doc.profile;
    await tx.insert(s.profile).values({
      id: 1,
      ...profile,
      headshotAssetId: await insertMedia(headshot),
      resumeAssetId: await insertMedia(resume),
    });
    await tx.insert(s.profileTranslations).values(rows(profileTranslations, { profileId: 1 }));

    if (doc.socialLinks.length) {
      await tx.insert(s.socialLinks).values(doc.socialLinks.map((l, i) => ({ ...l, sortOrder: i })));
    }

    for (const [i, { translations, ...role }] of doc.roles.entries()) {
      const [row] = await tx.insert(s.profileRoles).values({ ...role, sortOrder: i }).returning();
      await tx.insert(s.profileRoleTranslations).values(rows(translations, { roleId: row!.id }));
    }

    for (const [i, { translations, ...highlight }] of doc.highlights.entries()) {
      const [row] = await tx.insert(s.profileHighlights).values({ ...highlight, sortOrder: i }).returning();
      await tx.insert(s.profileHighlightTranslations).values(rows(translations, { highlightId: row!.id }));
    }

    for (const [i, { translations, ...metric }] of doc.metrics.entries()) {
      const [row] = await tx.insert(s.snapshotMetrics).values({ ...metric, sortOrder: i }).returning();
      await tx.insert(s.snapshotMetricTranslations).values(rows(translations, { metricId: row!.id }));
    }

    // Technologies and skills
    const techRows = await tx.insert(s.technologies).values(doc.technologies).returning();
    const techId = new Map(techRows.map((t) => [t.slug, t.id]));
    const techLinks = (slugs: string[]) =>
      slugs.map((slug, sortOrder) => ({ technologyId: techId.get(slug)!, sortOrder }));

    for (const [i, { translations, technologies, ...category }] of doc.skillCategories.entries()) {
      const [row] = await tx.insert(s.skillCategories).values({ ...category, sortOrder: i }).returning();
      await tx.insert(s.skillCategoryTranslations).values(rows(translations, { categoryId: row!.id }));
      await tx
        .insert(s.skillCategoryTechnologies)
        .values(techLinks(technologies).map((l) => ({ ...l, categoryId: row!.id })));
    }

    // Projects
    for (const [i, p] of doc.projects.entries()) {
      const { translations, technologies, repositories, cover, ...project } = p;
      const [row] = await tx
        .insert(s.projects)
        .values({
          ...project,
          demoUrl: project.demoUrl ?? null,
          sourceUrl: project.sourceUrl ?? null,
          detailsUrl: project.detailsUrl ?? null,
          sortOrder: i,
          publishedAt: project.status === 'published' ? new Date() : null,
        })
        .returning();
      const projectId = row!.id;
      await tx.insert(s.projectTranslations).values(rows(translations, { projectId }));
      if (technologies.length) {
        await tx.insert(s.projectTechnologies).values(techLinks(technologies).map((l) => ({ ...l, projectId })));
      }
      if (repositories.length) {
        await tx
          .insert(s.projectRepositories)
          .values(repositories.map((r, sortOrder) => ({ ...r, projectId, sortOrder })));
      }
      const coverId = await insertMedia(cover);
      if (coverId) await tx.insert(s.projectMedia).values({ projectId, assetId: coverId, role: 'cover' });
    }

    // Experience
    for (const [i, { translations, ...experience }] of doc.experiences.entries()) {
      const [row] = await tx
        .insert(s.experiences)
        .values({ ...experience, endDate: experience.endDate ?? null, sortOrder: i })
        .returning();
      await tx.insert(s.experienceTranslations).values(rows(translations, { experienceId: row!.id }));
    }

    return { status: 'seeded' };
  });
}
