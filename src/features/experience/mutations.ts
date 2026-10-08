'use server';

import { updateTag } from 'next/cache';
import { CACHE_TAGS } from '@/lib/cache-tags';
import { runMutation } from '@/lib/cms/mutation';
import { requireAdmin } from '@/server/auth/admin';
import { experiencesInput } from './schema';
import * as service from './service';

/** Experience editor: authorize, validate, write both lists, refresh the public experience reads. */
export async function saveExperiences(input: unknown) {
  const admin = await requireAdmin();
  return runMutation(experiencesInput, input, async (data) => {
    const saved = await service.saveExperiences(data, admin);
    updateTag(CACHE_TAGS.experience);
    return saved;
  });
}
