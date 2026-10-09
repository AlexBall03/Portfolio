import 'server-only';
import { asc, count, eq, inArray, sql } from 'drizzle-orm';
import { projectTechnologies, skillCategories, skillCategoryTechnologies, technologies } from '@/db/schema';
import type { Database } from '@/db/types';
import { reconcileList } from '@/lib/cms/write';
import type { SkillCategoriesInput } from './schema';
import type {
  SkillCategoriesValues,
  SkillCategory,
  SkillCategoryKind,
  SkillsOverview,
  TechnologyValues,
} from './types';

export async function getSkillsOverview(db: Database): Promise<SkillsOverview> {
  const rows = await db.query.skillCategories.findMany({
    where: eq(skillCategories.status, 'published'),
    orderBy: [asc(skillCategories.sortOrder), asc(skillCategories.createdAt)],
    with: { technologies: { with: { technology: true } } },
  });

  const categories = rows.map((row) => ({
    kind: row.kind,
    category: {
      slug: row.slug,
      name: row.name,
      icon: row.icon,
      accent: row.accent,
      technologies: [...row.technologies]
        .sort((a, b) => a.sortOrder - b.sortOrder)
        .map(({ technology }) => ({ slug: technology.slug, name: technology.name })),
    } satisfies SkillCategory,
  }));

  return {
    stack: categories.filter((c) => c.kind === 'stack').map((c) => c.category),
    learning: categories.filter((c) => c.kind === 'learning').map((c) => c.category),
  };
}

/* ── Admin editor reads ─────────────────────────────────────────────────────
 * Uncached and complete: hidden categories included.
 */

export async function listCategoryValues(db: Database): Promise<SkillCategoriesValues> {
  const rows = await db.query.skillCategories.findMany({
    orderBy: [asc(skillCategories.sortOrder), asc(skillCategories.createdAt)],
    with: { technologies: { with: { technology: true } } },
  });
  const values = (kind: SkillCategoryKind) =>
    rows
      .filter((row) => row.kind === kind)
      .map((row) => ({
        key: row.id,
        id: row.id,
        slug: row.slug,
        name: row.name,
        icon: row.icon,
        accent: row.accent,
        // Legacy `archived` rows read as hidden; a save stores them as drafts.
        visible: row.status === 'published',
        technologies: [...row.technologies]
          .sort((a, b) => a.sortOrder - b.sortOrder)
          .map(({ technology: t }) => ({ key: t.slug, slug: t.slug, name: t.name })),
      }));
  return { stack: values('stack'), learning: values('learning') };
}

export async function listTechnologyValues(db: Database): Promise<TechnologyValues[]> {
  const [rows, inProjects, inCategories] = await Promise.all([
    db.select().from(technologies).orderBy(asc(sql`lower(${technologies.name})`)),
    db
      .select({ id: projectTechnologies.technologyId, n: count() })
      .from(projectTechnologies)
      .groupBy(projectTechnologies.technologyId),
    db
      .select({ id: skillCategoryTechnologies.technologyId, n: count() })
      .from(skillCategoryTechnologies)
      .groupBy(skillCategoryTechnologies.technologyId),
  ]);
  const projects = new Map(inProjects.map((r) => [r.id, r.n]));
  const categories = new Map(inCategories.map((r) => [r.id, r.n]));
  return rows.map((t) => ({
    key: t.id,
    id: t.id,
    slug: t.slug,
    name: t.name,
    projects: projects.get(t.id) ?? 0,
    categories: categories.get(t.id) ?? 0,
  }));
}

/* ── Admin writes ───────────────────────────────────────────────────────────
 * Run inside one transaction by the service. `actor` is the admin's Clerk
 * user ID, recorded in created_by / updated_by.
 */

interface Actor {
  userId: string;
}

type CategoryItem = SkillCategoriesInput[SkillCategoryKind][number];

/**
 * Parks every category on a placeholder slug (its id) so the saves that
 * follow can rename, swap, or reuse slugs without tripping the unique index.
 * Every surviving row is rewritten with its real slug in the same transaction.
 */
export async function releaseCategorySlugs(db: Database): Promise<void> {
  await db.update(skillCategories).set({ slug: sql`${skillCategories.id}::text` });
}

/** Replaces one kind's list; the other kind is untouched. */
export async function replaceCategories(
  db: Database,
  kind: SkillCategoryKind,
  items: CategoryItem[],
  actor: Actor,
): Promise<void> {
  const existing = await db.select({ id: skillCategories.id }).from(skillCategories).where(eq(skillCategories.kind, kind));
  const fields = (item: CategoryItem, sortOrder: number) => ({
    kind,
    slug: item.slug,
    name: item.name,
    icon: item.icon,
    accent: item.accent,
    status: item.visible ? ('published' as const) : ('draft' as const),
    sortOrder,
    updatedBy: actor.userId,
  });
  await reconcileList(
    existing.map((r) => r.id),
    items,
    {
      update: async (id, item, sortOrder) => {
        await db.update(skillCategories).set(fields(item, sortOrder)).where(eq(skillCategories.id, id));
        await writeCategoryContent(db, id, item, actor);
      },
      insert: async (item, sortOrder) => {
        const [row] = await db
          .insert(skillCategories)
          .values({ ...fields(item, sortOrder), createdBy: actor.userId })
          .returning({ id: skillCategories.id });
        await writeCategoryContent(db, row!.id, item, actor);
        return row!.id;
      },
      remove: (ids) => db.delete(skillCategories).where(inArray(skillCategories.id, ids)),
    },
  );
}

async function writeCategoryContent(db: Database, categoryId: string, item: CategoryItem, actor: Actor) {
  // Technologies are a shared vocabulary: new ones are added, existing names are kept.
  await db.delete(skillCategoryTechnologies).where(eq(skillCategoryTechnologies.categoryId, categoryId));
  await db
    .insert(technologies)
    .values(item.technologies.map((t) => ({ ...t, createdBy: actor.userId, updatedBy: actor.userId })))
    .onConflictDoNothing({ target: technologies.slug });
  const ids = await db
    .select({ id: technologies.id, slug: technologies.slug })
    .from(technologies)
    .where(inArray(technologies.slug, item.technologies.map((t) => t.slug)));
  const idOf = new Map(ids.map((r) => [r.slug, r.id]));
  await db
    .insert(skillCategoryTechnologies)
    .values(item.technologies.map((t, sortOrder) => ({ categoryId, technologyId: idOf.get(t.slug)!, sortOrder })));
}

export async function renameTechnology(db: Database, id: string, name: string, actor: Actor): Promise<void> {
  await db.update(technologies).set({ name, updatedBy: actor.userId }).where(eq(technologies.id, id));
}

export async function deleteTechnologies(db: Database, ids: string[]): Promise<void> {
  if (ids.length) await db.delete(technologies).where(inArray(technologies.id, ids));
}
