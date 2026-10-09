import 'server-only';
import { and, asc, eq, inArray } from 'drizzle-orm';
import { mediaAssets, profile, profileHighlights, profileRoles, snapshotMetrics, socialLinks } from '@/db/schema';
import { deleteUnreferencedAssets, type StoredObject } from '@/db/media';
import type { Database } from '@/db/types';
import { reconcileList } from '@/lib/cms/write';
import { NotFoundError } from '@/lib/errors';
import { resolveMedia } from '@/lib/media';
import type {
  ProfileDetailsInput,
  ProfileHighlightsInput,
  ProfileRolesInput,
  SnapshotMetricsInput,
  SocialLinksInput,
} from './schema';
import type {
  Highlight,
  HeadshotValues,
  HighlightKind,
  HighlightsValues,
  HighlightValues,
  MetricValues,
  Profile,
  ProfileDetailsValues,
  ProfileRole,
  RoleValues,
  SnapshotMetric,
  SocialLink,
  SocialLinkValues,
} from './types';

export async function getProfile(db: Database): Promise<Profile | null> {
  const row = await db.query.profile.findFirst({
    where: eq(profile.id, 1),
    with: { headshot: true },
  });
  if (!row) return null;

  return {
    fullName: row.fullName,
    shortName: row.shortName,
    email: row.email,
    openToWork: row.openToWork,
    timeZone: row.timeZone,
    addressRegion: row.addressRegion,
    addressCountry: row.addressCountry,
    headshot: resolveMedia(row.headshot),
    title: row.title,
    statement: row.statement,
    availabilityText: row.availabilityText,
    locationLabel: row.locationLabel,
    about: row.about,
    hero: { focus: row.heroFocus, stackLine: row.heroStackLine, chips: row.heroChips },
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

export async function listProfileRoles(db: Database): Promise<ProfileRole[]> {
  return db
    .select({ label: profileRoles.label, accent: profileRoles.accent })
    .from(profileRoles)
    .where(eq(profileRoles.visible, true))
    .orderBy(asc(profileRoles.sortOrder), asc(profileRoles.createdAt));
}

export async function listHighlights(db: Database, kind: 'differentiator' | 'resume'): Promise<Highlight[]> {
  return db
    .select({ icon: profileHighlights.icon, title: profileHighlights.title, body: profileHighlights.body })
    .from(profileHighlights)
    .where(and(eq(profileHighlights.visible, true), eq(profileHighlights.kind, kind)))
    .orderBy(asc(profileHighlights.sortOrder), asc(profileHighlights.createdAt));
}

export async function listSnapshotMetrics(db: Database): Promise<SnapshotMetric[]> {
  return db
    .select({
      icon: snapshotMetrics.icon,
      source: snapshotMetrics.source,
      value: snapshotMetrics.value,
      suffix: snapshotMetrics.suffix,
      accent: snapshotMetrics.accent,
      label: snapshotMetrics.label,
      note: snapshotMetrics.note,
    })
    .from(snapshotMetrics)
    .where(eq(snapshotMetrics.visible, true))
    .orderBy(asc(snapshotMetrics.sortOrder), asc(snapshotMetrics.createdAt));
}

/* ── Admin editor reads ─────────────────────────────────────────────────────
 * Uncached and complete: hidden rows included, so the editor shows exactly
 * what is stored.
 */

const PROFILE_ID = 1;

export async function getProfileDetailsValues(db: Database): Promise<ProfileDetailsValues | null> {
  const row = await db.query.profile.findFirst({ where: eq(profile.id, PROFILE_ID) });
  if (!row) return null;
  return {
    fullName: row.fullName,
    shortName: row.shortName,
    email: row.email,
    openToWork: row.openToWork,
    timeZone: row.timeZone,
    addressRegion: row.addressRegion ?? '',
    addressCountry: row.addressCountry ?? '',
    title: row.title,
    statement: row.statement,
    availabilityText: row.availabilityText,
    locationLabel: row.locationLabel,
    about: row.about,
    heroFocus: row.heroFocus,
    heroStackLine: row.heroStackLine,
    heroChips: row.heroChips,
  };
}

export async function listRoleValues(db: Database): Promise<RoleValues[]> {
  const rows = await db.query.profileRoles.findMany({
    orderBy: [asc(profileRoles.sortOrder), asc(profileRoles.createdAt)],
  });
  return rows.map((row) => ({ key: row.id, id: row.id, label: row.label, accent: row.accent, visible: row.visible }));
}

export async function listHighlightValues(db: Database): Promise<HighlightsValues> {
  const rows = await db.query.profileHighlights.findMany({
    orderBy: [asc(profileHighlights.sortOrder), asc(profileHighlights.createdAt)],
  });
  const values = (kind: HighlightKind): HighlightValues[] =>
    rows
      .filter((row) => row.kind === kind)
      .map((row) => ({
        key: row.id,
        id: row.id,
        icon: row.icon ?? '',
        title: row.title,
        body: row.body,
        visible: row.visible,
      }));
  return { differentiator: values('differentiator'), resume: values('resume') };
}

export async function listMetricValues(db: Database): Promise<MetricValues[]> {
  const rows = await db.query.snapshotMetrics.findMany({
    orderBy: [asc(snapshotMetrics.sortOrder), asc(snapshotMetrics.createdAt)],
  });
  return rows.map((row) => ({
    key: row.id,
    id: row.id,
    icon: row.icon,
    label: row.label,
    note: row.note,
    source: row.source,
    value: row.value,
    suffix: row.suffix,
    accent: row.accent,
    visible: row.visible,
  }));
}

export async function listSocialLinkValues(db: Database): Promise<SocialLinkValues[]> {
  const rows = await db.select().from(socialLinks).orderBy(asc(socialLinks.sortOrder), asc(socialLinks.createdAt));
  return rows.map((row) => ({
    key: row.id,
    id: row.id,
    platform: row.platform,
    label: row.label,
    url: row.url,
    handle: row.handle ?? '',
    visible: row.visible,
  }));
}

/* ── Admin writes ───────────────────────────────────────────────────────────
 * Run inside one transaction by the service. `actor` is the admin's Clerk
 * user ID, recorded in created_by / updated_by.
 */

export interface Actor {
  userId: string;
}

export async function updateProfileDetails(db: Database, data: ProfileDetailsInput, actor: Actor): Promise<void> {
  const updated = await db
    .update(profile)
    .set({
      ...data,
      addressRegion: data.addressRegion ?? null,
      addressCountry: data.addressCountry ?? null,
      updatedBy: actor.userId,
    })
    .where(eq(profile.id, PROFILE_ID))
    .returning({ id: profile.id });
  if (!updated.length) throw new Error('The site profile row is missing');
}

type RoleItem = ProfileRolesInput['items'][number];

export async function replaceProfileRoles(db: Database, items: RoleItem[], actor: Actor): Promise<void> {
  const existing = await db.select({ id: profileRoles.id }).from(profileRoles);
  await reconcileList(
    existing.map((r) => r.id),
    items,
    {
      update: (id, { label, accent, visible }, sortOrder) =>
        db
          .update(profileRoles)
          .set({ label, accent, visible, sortOrder, updatedBy: actor.userId })
          .where(eq(profileRoles.id, id)),
      insert: async ({ label, accent, visible }, sortOrder) => {
        const [row] = await db
          .insert(profileRoles)
          .values({ label, accent, visible, sortOrder, createdBy: actor.userId, updatedBy: actor.userId })
          .returning({ id: profileRoles.id });
        return row!.id;
      },
      remove: (ids) => db.delete(profileRoles).where(inArray(profileRoles.id, ids)),
    },
  );
}

type HighlightItem = ProfileHighlightsInput[HighlightKind][number];

/** Replaces one kind's list; the other kind is untouched. */
export async function replaceHighlights(
  db: Database,
  kind: HighlightKind,
  items: HighlightItem[],
  actor: Actor,
): Promise<void> {
  const existing = await db
    .select({ id: profileHighlights.id })
    .from(profileHighlights)
    .where(eq(profileHighlights.kind, kind));
  const fields = ({ icon, title, body, visible }: HighlightItem, sortOrder: number) => ({
    icon: icon ?? null,
    title,
    body,
    visible,
    sortOrder,
    updatedBy: actor.userId,
  });
  await reconcileList(
    existing.map((r) => r.id),
    items,
    {
      update: (id, item, sortOrder) =>
        db
          .update(profileHighlights)
          .set(fields(item, sortOrder))
          .where(and(eq(profileHighlights.id, id), eq(profileHighlights.kind, kind))),
      insert: async (item, sortOrder) => {
        const [row] = await db
          .insert(profileHighlights)
          .values({ kind, ...fields(item, sortOrder), createdBy: actor.userId })
          .returning({ id: profileHighlights.id });
        return row!.id;
      },
      remove: (ids) => db.delete(profileHighlights).where(inArray(profileHighlights.id, ids)),
    },
  );
}

type MetricItem = SnapshotMetricsInput['items'][number];

export async function replaceSnapshotMetrics(db: Database, items: MetricItem[], actor: Actor): Promise<void> {
  const existing = await db.select({ id: snapshotMetrics.id }).from(snapshotMetrics);
  const fields = ({ icon, label, note, source, value, suffix, accent, visible }: MetricItem) => ({
    icon,
    label,
    note,
    source,
    value,
    suffix,
    accent,
    visible,
  });
  await reconcileList(
    existing.map((r) => r.id),
    items,
    {
      update: (id, item, sortOrder) =>
        db
          .update(snapshotMetrics)
          .set({ ...fields(item), sortOrder, updatedBy: actor.userId })
          .where(eq(snapshotMetrics.id, id)),
      insert: async (item, sortOrder) => {
        const [row] = await db
          .insert(snapshotMetrics)
          .values({ ...fields(item), sortOrder, createdBy: actor.userId, updatedBy: actor.userId })
          .returning({ id: snapshotMetrics.id });
        return row!.id;
      },
      remove: (ids) => db.delete(snapshotMetrics).where(inArray(snapshotMetrics.id, ids)),
    },
  );
}

type SocialLinkItem = SocialLinksInput['items'][number];

export async function replaceSocialLinks(db: Database, items: SocialLinkItem[], actor: Actor): Promise<void> {
  const existing = await db.select({ id: socialLinks.id }).from(socialLinks);
  const fields = ({ platform, label, url, handle, visible }: SocialLinkItem, sortOrder: number) => ({
    platform,
    label,
    url,
    handle: handle ?? null,
    visible,
    sortOrder,
    updatedBy: actor.userId,
  });
  await reconcileList(
    existing.map((r) => r.id),
    items,
    {
      update: (id, item, sortOrder) => db.update(socialLinks).set(fields(item, sortOrder)).where(eq(socialLinks.id, id)),
      insert: async (item, sortOrder) => {
        const [row] = await db
          .insert(socialLinks)
          .values({ ...fields(item, sortOrder), createdBy: actor.userId })
          .returning({ id: socialLinks.id });
        return row!.id;
      },
      remove: (ids) => db.delete(socialLinks).where(inArray(socialLinks.id, ids)),
    },
  );
}

/* ── Headshot ─────────────────────────────────────────────────────────────── */

export async function getHeadshotValues(db: Database): Promise<HeadshotValues | null> {
  const row = await db.query.profile.findFirst({
    where: eq(profile.id, PROFILE_ID),
    columns: { id: true },
    with: { headshot: true },
  });
  if (!row) return null;
  const asset = row.headshot;
  return {
    photo: asset
      ? {
          src: resolveMedia(asset)!.src,
          width: asset.width,
          height: asset.height,
          uploaded: asset.storage === 'blob',
        }
      : null,
    alt: asset?.alt ?? '',
  };
}

async function currentHeadshotId(db: Database): Promise<string | null> {
  const [row] = await db
    .select({ assetId: profile.headshotAssetId })
    .from(profile)
    .where(eq(profile.id, PROFILE_ID))
    .for('update');
  if (!row) throw new Error('The site profile row is missing');
  return row.assetId;
}

export type { StoredObject };

export interface NewHeadshot {
  src: string;
  mimeType: string;
  width: number | null;
  height: number | null;
}

/**
 * Points the profile at a newly uploaded photo with its alt text. The old
 * asset is deleted unless something else uses it; its file is returned for
 * removal after commit.
 */
export async function setHeadshot(db: Database, image: NewHeadshot, alt: string, actor: Actor): Promise<StoredObject[]> {
  const previous = await currentHeadshotId(db);
  const [asset] = await db
    .insert(mediaAssets)
    .values({ storage: 'blob', ...image, alt, createdBy: actor.userId, updatedBy: actor.userId })
    .returning({ id: mediaAssets.id });
  await db.update(profile).set({ headshotAssetId: asset!.id, updatedBy: actor.userId }).where(eq(profile.id, PROFILE_ID));
  return deleteUnreferencedAssets(db, [previous]);
}

/** Updates the current photo's alt text. */
export async function updateHeadshotText(db: Database, alt: string, actor: Actor) {
  const assetId = await currentHeadshotId(db);
  if (!assetId) throw new NotFoundError('The headshot');
  await db.update(mediaAssets).set({ alt, updatedBy: actor.userId }).where(eq(mediaAssets.id, assetId));
}

/** Removes the photo (the site then shows its placeholder). Returns the file to remove after commit. */
export async function clearHeadshot(db: Database, actor: Actor): Promise<StoredObject[]> {
  const previous = await currentHeadshotId(db);
  if (!previous) return [];
  await db.update(profile).set({ headshotAssetId: null, updatedBy: actor.userId }).where(eq(profile.id, PROFILE_ID));
  return deleteUnreferencedAssets(db, [previous]);
}
