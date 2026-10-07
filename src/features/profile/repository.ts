import 'server-only';
import { and, asc, eq } from 'drizzle-orm';
import { profile, profileHighlights, profileRoles, snapshotMetrics, socialLinks } from '@/db/schema';
import type { Database } from '@/db/types';
import type { Locale } from '@/i18n/config';
import { mapTranslated, pickTranslation } from '@/i18n/translations';
import { resolveMedia } from '@/lib/media';
import type { Highlight, Profile, ProfileRole, SnapshotMetric, SocialLink } from './types';

export async function getProfile(db: Database, locale: Locale): Promise<Profile | null> {
  const row = await db.query.profile.findFirst({
    where: eq(profile.id, 1),
    with: {
      translations: true,
      headshot: { with: { translations: true } },
      resume: { with: { translations: true } },
    },
  });
  const t = row && pickTranslation(row.translations, locale);
  if (!row || !t) return null;

  return {
    fullName: row.fullName,
    shortName: row.shortName,
    email: row.email,
    openToWork: row.openToWork,
    timeZone: row.timeZone,
    addressRegion: row.addressRegion,
    addressCountry: row.addressCountry,
    headshot: resolveMedia(row.headshot, locale),
    resume: resolveMedia(row.resume, locale),
    title: t.title,
    statement: t.statement,
    availabilityText: t.availabilityText,
    locationLabel: t.locationLabel,
    about: t.about,
    hero: { focus: t.heroFocus, stackLine: t.heroStackLine, chips: t.heroChips },
  };
}

export async function listSocialLinks(db: Database): Promise<SocialLink[]> {
  return db
    .select({
      platform: socialLinks.platform,
      label: socialLinks.label,
      url: socialLinks.url,
      handle: socialLinks.handle,
    })
    .from(socialLinks)
    .where(eq(socialLinks.visible, true))
    .orderBy(asc(socialLinks.sortOrder), asc(socialLinks.createdAt));
}

export async function listProfileRoles(db: Database, locale: Locale): Promise<ProfileRole[]> {
  const rows = await db.query.profileRoles.findMany({
    where: eq(profileRoles.visible, true),
    orderBy: [asc(profileRoles.sortOrder), asc(profileRoles.createdAt)],
    with: { translations: true },
  });
  return mapTranslated(rows, locale, (row, t) => ({ label: t.label, accent: row.accent }));
}

export async function listHighlights(
  db: Database,
  locale: Locale,
  kind: 'differentiator' | 'resume',
): Promise<Highlight[]> {
  const rows = await db.query.profileHighlights.findMany({
    where: and(eq(profileHighlights.visible, true), eq(profileHighlights.kind, kind)),
    orderBy: [asc(profileHighlights.sortOrder), asc(profileHighlights.createdAt)],
    with: { translations: true },
  });
  return mapTranslated(rows, locale, (row, t) => ({ icon: row.icon, title: t.title, body: t.body }));
}

export async function listSnapshotMetrics(db: Database, locale: Locale): Promise<SnapshotMetric[]> {
  const rows = await db.query.snapshotMetrics.findMany({
    where: eq(snapshotMetrics.visible, true),
    orderBy: [asc(snapshotMetrics.sortOrder), asc(snapshotMetrics.createdAt)],
    with: { translations: true },
  });
  return mapTranslated(rows, locale, (row, t) => ({
    icon: row.icon,
    value: row.value,
    suffix: row.suffix,
    accent: row.accent,
    label: t.label,
    note: t.note,
  }));
}
