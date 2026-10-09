import { sql } from 'drizzle-orm';
import { isDeployment } from '../admin/env';
import { queryRows } from '../raw';
import * as s from '../schema';
import type { Database } from '../types';
import type { MediaInput } from '../../lib/validation';
import { contentSeedSchema, type ContentSeed } from './schema';

/**
 * Tables owned by the content seed, in an order safe to TRUNCATE ... CASCADE.
 * A database counts as new only while all of them are empty.
 */
const CONTENT_TABLES = [
  s.resumeVersions,
  s.projectRelations,
  s.projectMilestones,
  s.projectSectionMedia,
  s.projectSectionItems,
  s.projectSections,
  s.projectMedia,
  s.projectRepositories,
  s.projectTechnologies,
  s.projectSlugHistory,
  s.projects,
  s.skillCategoryTechnologies,
  s.skillCategories,
  s.technologies,
  s.experiences,
  s.snapshotMetrics,
  s.profileHighlights,
  s.profileRoles,
  s.socialLinks,
  s.profile,
  s.sectionContent,
  s.pageContent,
  s.siteSettings,
  s.mediaAssets,
];

export type SeedResult =
  /** The database was new: the content document was loaded. */
  | { status: 'seeded' }
  /** The database already held content but no marker: the marker was recorded, nothing else written. */
  | { status: 'adopted' }
  /** The database was bootstrapped before: nothing written. */
  | { status: 'skipped' };

/**
 * Bootstraps a brand-new database with the content document, exactly once.
 *
 * Whether a database has been bootstrapped is recorded explicitly in
 * `content_bootstrap`, not inferred from its rows, so content edited or deleted
 * later is never restored. Everything runs in one transaction, and claiming the
 * marker row is what serializes concurrent runs: the loser waits on the primary
 * key, then sees the conflict and skips. Safe to call on every deployment.
 *
 * `force` is the only destructive path: it clears every content table and
 * reloads the document. It is a manual, local operation and is refused in
 * deployments.
 */
export async function seedContent(
  db: Database,
  input: unknown,
  { force = false }: { force?: boolean } = {},
): Promise<SeedResult> {
  if (force && isDeployment()) {
    throw new Error('Refusing to reset content from a deployment or CI environment.');
  }
  const doc: ContentSeed = contentSeedSchema.parse(input);

  return db.transaction(async (tx) => {
    if (force) {
      const names = [...CONTENT_TABLES, s.contentBootstrap].map((t) => sql`${t}`);
      await tx.execute(sql`TRUNCATE ${sql.join(names, sql`, `)} CASCADE`);
    } else {
      const [marker] = await tx.select({ id: s.contentBootstrap.id }).from(s.contentBootstrap).limit(1);
      if (marker) return { status: 'skipped' };
    }

    const populated = CONTENT_TABLES.map((t) => sql`exists (select 1 from ${t})`);
    const [existing] = await queryRows<{ present: boolean }>(
      tx,
      sql`select (${sql.join(populated, sql` or `)}) as present`,
    );
    const hasContent = existing?.present === true;

    const [claimed] = await tx
      .insert(s.contentBootstrap)
      .values({ id: 1, source: hasContent ? 'adopted' : 'seed' })
      .onConflictDoNothing()
      .returning({ id: s.contentBootstrap.id });
    if (!claimed) return { status: 'skipped' };
    if (hasContent) return { status: 'adopted' };

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
          alt: media.alt,
        })
        .returning({ id: s.mediaAssets.id });
      if (!asset) throw new Error('Failed to insert media asset');
      return asset.id;
    };

    // Site settings and page copy
    await tx.insert(s.siteSettings).values({ id: 1, ...doc.settings });
    for (const [pageKey, page] of Object.entries(doc.pages)) {
      await tx.insert(s.pageContent).values({ ...page, pageKey: pageKey as keyof typeof doc.pages });
    }
    for (const [sectionKey, section] of Object.entries(doc.sections)) {
      await tx.insert(s.sectionContent).values({ ...section, sectionKey: sectionKey as keyof typeof doc.sections });
    }

    // Profile
    const { headshot, ...profile } = doc.profile;
    await tx.insert(s.profile).values({
      id: 1,
      ...profile,
      headshotAssetId: await insertMedia(headshot),
    });

    if (doc.socialLinks.length) {
      await tx.insert(s.socialLinks).values(doc.socialLinks.map((l, i) => ({ ...l, sortOrder: i })));
    }

    if (doc.roles.length) {
      await tx.insert(s.profileRoles).values(doc.roles.map((role, i) => ({ ...role, sortOrder: i })));
    }
    if (doc.highlights.length) {
      await tx.insert(s.profileHighlights).values(doc.highlights.map((h, i) => ({ ...h, sortOrder: i })));
    }
    if (doc.metrics.length) {
      await tx.insert(s.snapshotMetrics).values(doc.metrics.map((m, i) => ({ ...m, sortOrder: i })));
    }

    // Technologies and skills
    const techRows = await tx.insert(s.technologies).values(doc.technologies).returning();
    const techId = new Map(techRows.map((t) => [t.slug, t.id]));
    const techLinks = (slugs: string[]) =>
      slugs.map((slug, sortOrder) => ({ technologyId: techId.get(slug)!, sortOrder }));

    for (const [i, { technologies, ...category }] of doc.skillCategories.entries()) {
      const [row] = await tx.insert(s.skillCategories).values({ ...category, sortOrder: i }).returning();
      await tx
        .insert(s.skillCategoryTechnologies)
        .values(techLinks(technologies).map((l) => ({ ...l, categoryId: row!.id })));
    }

    // Projects
    for (const [i, p] of doc.projects.entries()) {
      const { technologies, repositories, cover, ...project } = p;
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
    if (doc.experiences.length) {
      await tx.insert(s.experiences).values(
        doc.experiences.map((e, i) => ({
          ...e,
          endDate: e.endDate ?? null,
          organizationLabel: e.organizationLabel ?? null,
          employmentType: e.employmentType ?? null,
          location: e.location ?? null,
          sortOrder: i,
        })),
      );
    }

    return { status: 'seeded' };
  });
}
