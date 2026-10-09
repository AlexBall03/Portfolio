import 'server-only';
import { getDb, withTransaction } from '@/db/client';

import { FieldValidationError } from '@/lib/errors';
import * as repo from './repository';
import type { SkillCategoriesInput, TechnologiesInput } from './schema';
import type { SkillCategoriesValues, TechnologyValues } from './types';

/**
 * Skills administration: categories (stack groups and "learning next"
 * banners) and the shared technology vocabulary. Validated input, authorized
 * caller; no React or HTTP. One save is one transaction, then a re-read.
 */

export async function loadSkillCategories(): Promise<SkillCategoriesValues> {
  return repo.listCategoryValues(await getDb());
}

export async function loadTechnologyValues(): Promise<TechnologyValues[]> {
  return repo.listTechnologyValues(await getDb());
}

export async function saveSkillCategories(data: SkillCategoriesInput, actor: { userId: string }) {
  await withTransaction(async (tx) => {
    await repo.releaseCategorySlugs(tx);
    await repo.replaceCategories(tx, 'stack', data.stack, actor);
    await repo.replaceCategories(tx, 'learning', data.learning, actor);
  });
  return loadSkillCategories();
}

/**
 * Renames technologies and removes the ones left out of the list. A
 * technology still listed by a project or category can't be removed: it has
 * to be taken out there first (the foreign keys also refuse it).
 */
export async function saveTechnologies(data: TechnologiesInput, actor: { userId: string }) {
  await withTransaction(async (tx) => {
    const current = await repo.listTechnologyValues(tx);
    const kept = new Map(data.items.map((t) => [t.id, t.name]));
    const removed = current.filter((t) => !kept.has(t.id));
    const inUse = removed.filter((t) => t.projects + t.categories > 0);
    if (inUse.length) {
      throw new FieldValidationError({
        items: `Still in use, so it can't be removed: ${inUse.map((t) => t.name).join(', ')}. Take it out of those projects or categories first.`,
      });
    }
    for (const t of current) {
      const name = kept.get(t.id);
      if (name !== undefined && name !== t.name) await repo.renameTechnology(tx, t.id, name, actor);
    }
    await repo.deleteTechnologies(tx, removed.map((t) => t.id));
  });
  return { items: await loadTechnologyValues() };
}

