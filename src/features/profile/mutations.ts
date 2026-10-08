'use server';

import { updateTag } from 'next/cache';
import { CACHE_TAGS } from '@/lib/cache-tags';
import { runMutation } from '@/lib/cms/mutation';
import { requireAdmin } from '@/server/auth/admin';
import { profileDetailsInput, profileHighlightsInput, profileRolesInput, snapshotMetricsInput } from './schema';
import * as service from './service';

/**
 * Profile editor Server Actions. Each one authorizes first (the action ID is
 * callable from any page), then validates, writes, and refreshes the public
 * profile reads. Snapshot metrics share the `profile` tag.
 */

export async function saveProfileDetails(input: unknown) {
  const admin = await requireAdmin();
  return runMutation(profileDetailsInput, input, async (data) => {
    const saved = await service.saveProfileDetails(data, admin);
    updateTag(CACHE_TAGS.profile);
    return saved;
  });
}

export async function saveProfileRoles(input: unknown) {
  const admin = await requireAdmin();
  return runMutation(profileRolesInput, input, async (data) => {
    const saved = await service.saveProfileRoles(data, admin);
    updateTag(CACHE_TAGS.profile);
    return saved;
  });
}

export async function saveProfileHighlights(input: unknown) {
  const admin = await requireAdmin();
  return runMutation(profileHighlightsInput, input, async (data) => {
    const saved = await service.saveProfileHighlights(data, admin);
    updateTag(CACHE_TAGS.profile);
    return saved;
  });
}

export async function saveSnapshotMetrics(input: unknown) {
  const admin = await requireAdmin();
  return runMutation(snapshotMetricsInput, input, async (data) => {
    const saved = await service.saveSnapshotMetrics(data, admin);
    updateTag(CACHE_TAGS.profile);
    return saved;
  });
}
