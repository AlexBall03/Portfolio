'use server';

import { updateTag } from 'next/cache';
import { z } from 'zod';
import { CACHE_TAGS } from '@/lib/cache-tags';
import { runMutation } from '@/lib/cms/mutation';
import { requireAdmin } from '@/server/auth/admin';
import { resumeLabelInput, resumeVersionInput } from './schema';
import * as service from './service';

/**
 * Resume Server Actions. Each one authorizes first (the action ID is callable
 * from any page), then validates, writes, and refreshes the public resume
 * reads. Uploads are a Route Handler (`app/api/admin/resume`): files exceed
 * the Server Action body limit.
 */

export async function publishResumeVersion(input: unknown) {
  const admin = await requireAdmin();
  return runMutation(resumeVersionInput, input, async ({ id }) => {
    const saved = await service.publishResume(id, admin);
    updateTag(CACHE_TAGS.resume);
    return saved;
  });
}

export async function unpublishResume(input: unknown) {
  const admin = await requireAdmin();
  return runMutation(z.object({}), input, async () => {
    const saved = await service.unpublishResume(admin);
    updateTag(CACHE_TAGS.resume);
    return saved;
  });
}

/** Labels are admin-only metadata: nothing public changes, so no tag is refreshed. */
export async function updateResumeLabel(input: unknown) {
  const admin = await requireAdmin();
  return runMutation(resumeLabelInput, input, (data) => service.updateResumeLabel(data, admin));
}

export async function deleteResumeVersion(input: unknown) {
  await requireAdmin();
  return runMutation(resumeVersionInput, input, async ({ id }) => {
    const saved = await service.deleteResume(id);
    // Only unpublished versions can be deleted, so public output can't change; refreshing is cheap insurance.
    updateTag(CACHE_TAGS.resume);
    return saved;
  });
}
