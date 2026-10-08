'use server';

import { updateTag } from 'next/cache';
import { CACHE_TAGS } from '@/lib/cache-tags';
import { runMutation } from '@/lib/cms/mutation';
import { requireAdmin } from '@/server/auth/admin';
import { contactCopyInput, pageCopyInput, siteSettingsInput } from './schema';
import * as service from './service';

/** Configuration page Server Action: authorize, validate, write, refresh every `site`-tagged read. */
export async function saveSiteSettings(input: unknown) {
  const admin = await requireAdmin();
  return runMutation(siteSettingsInput, input, async (data) => {
    const saved = await service.saveSiteSettings(data, admin);
    updateTag(CACHE_TAGS.site);
    return saved;
  });
}

/** Page content editor: one page's SEO copy and section headings. */
export async function savePageCopy(input: unknown) {
  const admin = await requireAdmin();
  return runMutation(pageCopyInput, input, async (data) => {
    const saved = await service.savePageCopy(data, admin);
    updateTag(CACHE_TAGS.site);
    return saved;
  });
}

/** Contact editor: the contact section's heading and introduction. */
export async function saveContactCopy(input: unknown) {
  const admin = await requireAdmin();
  return runMutation(contactCopyInput, input, async (data) => {
    const saved = await service.saveContactCopy(data, admin);
    updateTag(CACHE_TAGS.site);
    return saved;
  });
}
