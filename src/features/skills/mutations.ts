'use server';

import { updateTag } from 'next/cache';
import { CACHE_TAGS } from '@/lib/cache-tags';
import { runMutation } from '@/lib/cms/mutation';
import { requireAdmin } from '@/server/auth/admin';
import { skillCategoriesInput, technologiesInput } from './schema';
import * as service from './service';

/**
 * Skills editor Server Actions. Each authorizes first, then validates,
 * writes, and refreshes the public reads. Technology names also appear on
 * projects, so renaming refreshes those too.
 */

export async function saveSkillCategories(input: unknown) {
  const admin = await requireAdmin();
  return runMutation(skillCategoriesInput, input, async (data) => {
    const saved = await service.saveSkillCategories(data, admin);
    updateTag(CACHE_TAGS.skills);
    return saved;
  });
}

export async function saveTechnologies(input: unknown) {
  const admin = await requireAdmin();
  return runMutation(technologiesInput, input, async (data) => {
    const saved = await service.saveTechnologies(data, admin);
    updateTag(CACHE_TAGS.skills);
    updateTag(CACHE_TAGS.projects);
    return saved;
  });
}
