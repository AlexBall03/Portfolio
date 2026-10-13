'use server';

import { updateTag } from 'next/cache';
import { z } from 'zod';
import { CACHE_TAGS } from '@/lib/cache-tags';
import { runMutation } from '@/lib/cms/mutation';
import { requireAdmin } from '@/server/auth/admin';
import { sponsorshipSettingsInput } from './schema';
import * as service from './service';

/** Sponsorship page Server Action: authorize, validate, write, refresh every `sponsorship`-tagged read. */
export async function saveSponsorshipSettings(input: unknown) {
  const admin = await requireAdmin();
  return runMutation(sponsorshipSettingsInput, input, async (data) => {
    const saved = await service.saveSponsorshipSettings(data, admin);
    updateTag(CACHE_TAGS.sponsorship);
    return saved;
  });
}

/** Reads the sponsors from GitHub again on the next request, instead of waiting out the cache. Writes nothing. */
export async function refreshSponsors(input: unknown) {
  await requireAdmin();
  return runMutation(z.object({}), input, async () => {
    updateTag(CACHE_TAGS.sponsorship);
    return null;
  });
}
