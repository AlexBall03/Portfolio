import 'server-only';
import { and, asc, eq, inArray } from 'drizzle-orm';
import {
  profile,
  profileHighlights,
  profileHighlightTranslations,
  profileRoles,
  profileRoleTranslations,
  profileTranslations,
  snapshotMetrics,
  snapshotMetricTranslations,
  socialLinks,
} from '@/db/schema';
import type { Database } from '@/db/types';
import type { Locale } from '@/i18n/config';
import { mapTranslated, pickTranslation } from '@/i18n/translations';
import { localeRecord } from '@/lib/cms/locale';
import { reconcileList, syncTranslations } from '@/lib/cms/write';
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
    source: row.source,
    value: row.value,
    suffix: row.suffix,
    accent: row.accent,
    label: t.label,
    note: t.note,
  }));
}

/* ── Admin editor reads ─────────────────────────────────────────────────────
 * Uncached and complete: hidden rows and every locale's raw translation, so
 * the editor shows exactly what is stored (no English fallback filled in).
 */

const PROFILE_ID = 1;

export async function getProfileDetailsValues(db: Database): Promise<ProfileDetailsValues | null> {
  const row = await db.query.profile.findFirst({ where: eq(profile.id, PROFILE_ID), with: { translations: true } });
  if (!row) return null;
  return {
    fullName: row.fullName,
    shortName: row.shortName,
    email: row.email,
    openToWork: row.openToWork,
    timeZone: row.timeZone,
    addressRegion: row.addressRegion ?? '',
    addressCountry: row.addressCountry ?? '',
    translations: localeRecord(
      row.translations,
      (t) => ({
        title: t.title,
        statement: t.statement,
        availabilityText: t.availabilityText,
        locationLabel: t.locationLabel,
        about: t.about,
        heroFocus: t.heroFocus,
        heroStackLine: t.heroStackLine,
        heroChips: t.heroChips,
      }),
      () => ({
        title: '',
        statement: '',
        availabilityText: '',
        locationLabel: '',
        about: [''],
        heroFocus: '',
        heroStackLine: '',
        heroChips: [],
      }),
    ),
  };
}

export async function listRoleValues(db: Database): Promise<RoleValues[]> {
  const rows = await db.query.profileRoles.findMany({
    orderBy: [asc(profileRoles.sortOrder), asc(profileRoles.createdAt)],
    with: { translations: true },
  });
  return rows.map((row) => ({
    key: row.id,
    id: row.id,
    accent: row.accent,
    visible: row.visible,
    translations: localeRecord(row.translations, (t) => ({ label: t.label }), () => ({ label: '' })),
  }));
}

export async function listHighlightValues(db: Database): Promise<HighlightsValues> {
  const rows = await db.query.profileHighlights.findMany({
    orderBy: [asc(profileHighlights.sortOrder), asc(profileHighlights.createdAt)],
    with: { translations: true },
  });
  const values = (kind: HighlightKind): HighlightValues[] =>
    rows
      .filter((row) => row.kind === kind)
      .map((row) => ({
        key: row.id,
        id: row.id,
        icon: row.icon ?? '',
        visible: row.visible,
        translations: localeRecord(
          row.translations,
          (t) => ({ title: t.title, body: t.body }),
          () => ({ title: '', body: '' }),
        ),
      }));
  return { differentiator: values('differentiator'), resume: values('resume') };
}

export async function listMetricValues(db: Database): Promise<MetricValues[]> {
  const rows = await db.query.snapshotMetrics.findMany({
    orderBy: [asc(snapshotMetrics.sortOrder), asc(snapshotMetrics.createdAt)],
    with: { translations: true },
  });
  return rows.map((row) => ({
    key: row.id,
    id: row.id,
    icon: row.icon,
    source: row.source,
    value: row.value,
    suffix: row.suffix,
    accent: row.accent,
    visible: row.visible,
    translations: localeRecord(
      row.translations,
      (t) => ({ label: t.label, note: t.note }),
      () => ({ label: '', note: '' }),
    ),
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
  const { translations, ...fields } = data;
  const updated = await db
    .update(profile)
    .set({
      ...fields,
      addressRegion: fields.addressRegion ?? null,
      addressCountry: fields.addressCountry ?? null,
      updatedBy: actor.userId,
    })
    .where(eq(profile.id, PROFILE_ID))
    .returning({ id: profile.id });
  if (!updated.length) throw new Error('The site profile row is missing');

  await syncTranslations(translations, {
    upsert: (locale, t) =>
      db
        .insert(profileTranslations)
        .values({ profileId: PROFILE_ID, locale, ...t })
        .onConflictDoUpdate({ target: [profileTranslations.profileId, profileTranslations.locale], set: t }),
    remove: (locale) =>
      db
        .delete(profileTranslations)
        .where(and(eq(profileTranslations.profileId, PROFILE_ID), eq(profileTranslations.locale, locale))),
  });
}

type RoleItem = ProfileRolesInput['items'][number];

export async function replaceProfileRoles(db: Database, items: RoleItem[], actor: Actor): Promise<void> {
  const existing = await db.select({ id: profileRoles.id }).from(profileRoles);
  await reconcileList(
    existing.map((r) => r.id),
    items,
    {
      update: async (id, { accent, visible, translations }, sortOrder) => {
        await db
          .update(profileRoles)
          .set({ accent, visible, sortOrder, updatedBy: actor.userId })
          .where(eq(profileRoles.id, id));
        await syncRoleTranslations(db, id, translations);
      },
      insert: async ({ accent, visible, translations }, sortOrder) => {
        const [row] = await db
          .insert(profileRoles)
          .values({ accent, visible, sortOrder, createdBy: actor.userId, updatedBy: actor.userId })
          .returning({ id: profileRoles.id });
        await syncRoleTranslations(db, row!.id, translations);
        return row!.id;
      },
      remove: (ids) => db.delete(profileRoles).where(inArray(profileRoles.id, ids)),
    },
  );
}

const syncRoleTranslations = (db: Database, roleId: string, translations: RoleItem['translations']) =>
  syncTranslations(translations, {
    upsert: (locale, t) =>
      db
        .insert(profileRoleTranslations)
        .values({ roleId, locale, ...t })
        .onConflictDoUpdate({ target: [profileRoleTranslations.roleId, profileRoleTranslations.locale], set: t }),
    remove: (locale) =>
      db
        .delete(profileRoleTranslations)
        .where(and(eq(profileRoleTranslations.roleId, roleId), eq(profileRoleTranslations.locale, locale))),
  });

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
  await reconcileList(
    existing.map((r) => r.id),
    items,
    {
      update: async (id, { icon, visible, translations }, sortOrder) => {
        await db
          .update(profileHighlights)
          .set({ icon: icon ?? null, visible, sortOrder, updatedBy: actor.userId })
          .where(and(eq(profileHighlights.id, id), eq(profileHighlights.kind, kind)));
        await syncHighlightTranslations(db, id, translations);
      },
      insert: async ({ icon, visible, translations }, sortOrder) => {
        const [row] = await db
          .insert(profileHighlights)
          .values({ kind, icon: icon ?? null, visible, sortOrder, createdBy: actor.userId, updatedBy: actor.userId })
          .returning({ id: profileHighlights.id });
        await syncHighlightTranslations(db, row!.id, translations);
        return row!.id;
      },
      remove: (ids) => db.delete(profileHighlights).where(inArray(profileHighlights.id, ids)),
    },
  );
}

const syncHighlightTranslations = (db: Database, highlightId: string, translations: HighlightItem['translations']) =>
  syncTranslations(translations, {
    upsert: (locale, t) =>
      db
        .insert(profileHighlightTranslations)
        .values({ highlightId, locale, ...t })
        .onConflictDoUpdate({
          target: [profileHighlightTranslations.highlightId, profileHighlightTranslations.locale],
          set: t,
        }),
    remove: (locale) =>
      db
        .delete(profileHighlightTranslations)
        .where(
          and(eq(profileHighlightTranslations.highlightId, highlightId), eq(profileHighlightTranslations.locale, locale)),
        ),
  });

type MetricItem = SnapshotMetricsInput['items'][number];

export async function replaceSnapshotMetrics(db: Database, items: MetricItem[], actor: Actor): Promise<void> {
  const existing = await db.select({ id: snapshotMetrics.id }).from(snapshotMetrics);
  const fields = ({ icon, source, value, suffix, accent, visible }: MetricItem) => ({
    icon,
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
      update: async (id, item, sortOrder) => {
        await db
          .update(snapshotMetrics)
          .set({ ...fields(item), sortOrder, updatedBy: actor.userId })
          .where(eq(snapshotMetrics.id, id));
        await syncMetricTranslations(db, id, item.translations);
      },
      insert: async (item, sortOrder) => {
        const [row] = await db
          .insert(snapshotMetrics)
          .values({ ...fields(item), sortOrder, createdBy: actor.userId, updatedBy: actor.userId })
          .returning({ id: snapshotMetrics.id });
        await syncMetricTranslations(db, row!.id, item.translations);
        return row!.id;
      },
      remove: (ids) => db.delete(snapshotMetrics).where(inArray(snapshotMetrics.id, ids)),
    },
  );
}

const syncMetricTranslations = (db: Database, metricId: string, translations: MetricItem['translations']) =>
  syncTranslations(translations, {
    upsert: (locale, t) =>
      db
        .insert(snapshotMetricTranslations)
        .values({ metricId, locale, ...t })
        .onConflictDoUpdate({
          target: [snapshotMetricTranslations.metricId, snapshotMetricTranslations.locale],
          set: t,
        }),
    remove: (locale) =>
      db
        .delete(snapshotMetricTranslations)
        .where(and(eq(snapshotMetricTranslations.metricId, metricId), eq(snapshotMetricTranslations.locale, locale))),
  });

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
