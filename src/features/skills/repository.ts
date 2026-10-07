import 'server-only';
import { asc, eq } from 'drizzle-orm';
import { skillCategories } from '@/db/schema';
import type { Database } from '@/db/types';
import type { Locale } from '@/i18n/config';
import { mapTranslated } from '@/i18n/translations';
import type { SkillCategory, SkillsOverview } from './types';

export async function getSkillsOverview(db: Database, locale: Locale): Promise<SkillsOverview> {
  const rows = await db.query.skillCategories.findMany({
    where: eq(skillCategories.status, 'published'),
    orderBy: [asc(skillCategories.sortOrder), asc(skillCategories.createdAt)],
    with: { translations: true, technologies: { with: { technology: true } } },
  });

  const categories = mapTranslated(rows, locale, (row, t) => ({
    kind: row.kind,
    category: {
      slug: row.slug,
      name: t.name,
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
