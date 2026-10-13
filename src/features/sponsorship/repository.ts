import 'server-only';
import { eq } from 'drizzle-orm';
import { sponsorshipSettings } from '@/db/schema';
import type { Database } from '@/db/types';
import type { SponsorshipSettingsInput } from './schema';
import type { SponsorshipSettings } from './types';

/** The stored settings, or null when they have never been saved (callers use the defaults). */
export async function getSponsorshipSettings(db: Database): Promise<SponsorshipSettings | null> {
  const [row] = await db.select().from(sponsorshipSettings).where(eq(sponsorshipSettings.id, 1)).limit(1);
  return row ? toSettings(row) : null;
}

function toSettings(row: typeof sponsorshipSettings.$inferSelect): SponsorshipSettings {
  return {
    enabled: row.enabled,
    showHomeSection: row.showHomeSection,
    supportPageEnabled: row.supportPageEnabled,
    heading: row.heading,
    description: row.description,
    ctaLabel: row.ctaLabel,
    sponsorsUrl: row.sponsorsUrl,
    showSponsors: row.showSponsors,
    showSponsorCount: row.showSponsorCount,
    homeSponsorLimit: row.homeSponsorLimit,
    sponsorSort: row.sponsorSort,
    hiddenSponsors: row.hiddenSponsors,
    supportTitle: row.supportTitle,
    supportIntro: row.supportIntro,
    supportItems: row.supportItems,
  };
}

/** Admin write (upsert); `actorId` is recorded as created_by (first save) / updated_by. */
export async function writeSponsorshipSettings(
  db: Database,
  data: SponsorshipSettingsInput,
  actorId: string,
): Promise<SponsorshipSettings> {
  const fields = { ...data, updatedBy: actorId };
  const [row] = await db
    .insert(sponsorshipSettings)
    .values({ id: 1, ...fields, createdBy: actorId })
    .onConflictDoUpdate({ target: sponsorshipSettings.id, set: { ...fields, updatedAt: new Date() } })
    .returning();
  if (!row) throw new Error('The sponsorship settings could not be saved');
  return toSettings(row);
}
