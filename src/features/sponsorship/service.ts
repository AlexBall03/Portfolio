import 'server-only';
import { getDb } from '@/db/client';
import * as repo from './repository';
import type { SponsorshipSettingsInput } from './schema';
import { DEFAULT_SPONSORSHIP_SETTINGS, type SponsorshipSettings, type SponsorshipValues } from './types';

/**
 * Sponsorship administration. Validated input, authorized caller; no React or
 * HTTP here. One row, written with a single upsert, so no transaction.
 */

const toValues = (s: SponsorshipSettings): SponsorshipValues => ({
  ...s,
  supportItems: s.supportItems.map((item, i) => ({ ...item, key: `item-${i}` })),
});

/** The stored settings, uncached; the defaults until they are first saved. */
export async function loadSponsorshipSettings(): Promise<SponsorshipValues> {
  return toValues((await repo.getSponsorshipSettings(await getDb())) ?? DEFAULT_SPONSORSHIP_SETTINGS);
}

export async function saveSponsorshipSettings(data: SponsorshipSettingsInput, actor: { userId: string }): Promise<SponsorshipValues> {
  return toValues(await repo.writeSponsorshipSettings(await getDb(), data, actor.userId));
}
