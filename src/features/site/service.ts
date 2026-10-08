import 'server-only';
import { getDb } from '@/db/client';
import { ContentMissingError } from '@/lib/errors';
import * as repo from './repository';
import type { SiteSettingsInput } from './schema';
import type { SiteSettings, SiteSettingsValues } from './types';

/**
 * Site configuration administration. Validated input, authorized caller; no
 * React or HTTP here. A single-row update is atomic on its own, so it runs on
 * the regular HTTP client rather than opening a transaction.
 */

const toValues = (s: SiteSettings): SiteSettingsValues => ({ ...s, githubUsername: s.githubUsername ?? '' });

/** The stored settings, uncached (the admin edits exactly what is in the database). */
export async function loadSiteSettings(): Promise<SiteSettingsValues> {
  const settings = await repo.getSiteSettings(await getDb());
  if (!settings) throw new ContentMissingError('Site settings');
  return toValues(settings);
}

export async function saveSiteSettings(data: SiteSettingsInput, actor: { userId: string }): Promise<SiteSettingsValues> {
  return toValues(await repo.updateSiteSettings(await getDb(), data, actor.userId));
}
