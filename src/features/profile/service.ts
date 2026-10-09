import 'server-only';
import { getDb, withTransaction } from '@/db/client';
import { DEFAULT_LOCALE, LOCALES, type Locale } from '@/i18n/config';
import { blobStore, type MediaStore } from '@/integrations/blob/store';
import { translationCoverage, type TranslationCoverage } from '@/lib/cms/locale';
import { removeStoredFiles } from '@/lib/cms/media-files';
import { ContentMissingError, FieldValidationError } from '@/lib/errors';
import { MAX_IMAGE_BYTES, sniffImage } from '@/lib/image-file';
import { createLogger } from '@/lib/logger';
import * as repo from './repository';
import {
  highlightTranslationInput,
  metricTranslationInput,
  profileTranslationInput,
  roleTranslationInput,
  type HeadshotTextInput,
  type ProfileDetailsInput,
  type ProfileHighlightsInput,
  type ProfileRolesInput,
  type SnapshotMetricsInput,
  type SocialLinksInput,
} from './schema';
import type { HeadshotValues, HighlightsValues, MetricValues, ProfileDetailsValues, RoleValues, SocialLinkValues } from './types';

/**
 * Profile administration: the domain operations behind the admin editors.
 * Input is already validated and the caller already authorized; nothing here
 * knows about React, forms, or HTTP, so a future API route or sync job can
 * call the same functions. Each save is one transaction, then returns the
 * stored state so the editor resets to exactly what was saved.
 */

export async function loadProfileDetails(): Promise<ProfileDetailsValues> {
  const values = await repo.getProfileDetailsValues(await getDb());
  if (!values) throw new ContentMissingError('The site profile');
  return values;
}

export async function loadProfileRoles(): Promise<RoleValues[]> {
  return repo.listRoleValues(await getDb());
}

export async function loadProfileHighlights(): Promise<HighlightsValues> {
  return repo.listHighlightValues(await getDb());
}

export async function loadSnapshotMetrics(): Promise<MetricValues[]> {
  return repo.listMetricValues(await getDb());
}

export async function saveProfileDetails(data: ProfileDetailsInput, actor: repo.Actor) {
  await withTransaction((tx) => repo.updateProfileDetails(tx, data, actor));
  return loadProfileDetails();
}

export async function saveProfileRoles(data: ProfileRolesInput, actor: repo.Actor) {
  await withTransaction((tx) => repo.replaceProfileRoles(tx, data.items, actor));
  return { items: await loadProfileRoles() };
}

export async function saveProfileHighlights(data: ProfileHighlightsInput, actor: repo.Actor) {
  await withTransaction(async (tx) => {
    await repo.replaceHighlights(tx, 'differentiator', data.differentiator, actor);
    await repo.replaceHighlights(tx, 'resume', data.resume, actor);
  });
  return loadProfileHighlights();
}

export async function saveSnapshotMetrics(data: SnapshotMetricsInput, actor: repo.Actor) {
  await withTransaction((tx) => repo.replaceSnapshotMetrics(tx, data.items, actor));
  return { items: await loadSnapshotMetrics() };
}

export async function loadSocialLinks(): Promise<SocialLinkValues[]> {
  return repo.listSocialLinkValues(await getDb());
}

export async function saveSocialLinks(data: SocialLinksInput, actor: repo.Actor) {
  await withTransaction((tx) => repo.replaceSocialLinks(tx, data.items, actor));
  return { items: await loadSocialLinks() };
}

/* ── Headshot ─────────────────────────────────────────────────────────────── */

const log = createLogger('profile');

/**
 * Formats the headshot accepts. Narrower than project images on purpose: the
 * photo is also drawn into the generated share cards, whose renderer decodes
 * only JPEG and PNG.
 */
const HEADSHOT_TYPES = new Set(['image/jpeg', 'image/png']);

export async function loadHeadshot(): Promise<HeadshotValues> {
  const values = await repo.getHeadshotValues(await getDb());
  if (!values) throw new ContentMissingError('The site profile');
  return values;
}

/**
 * Stores a new headshot (checked by its bytes) under a server-chosen path and
 * makes it current, with its alt text. The previous photo is deleted once the
 * transaction commits; a failed transaction deletes the new file again.
 */
export async function uploadHeadshot(
  data: { bytes: Uint8Array } & HeadshotTextInput,
  actor: repo.Actor,
  store: MediaStore = blobStore,
): Promise<HeadshotValues> {
  if (!store.configured()) {
    throw new FieldValidationError({ file: 'Image storage is not configured (connect a Vercel Blob store).' });
  }
  if (data.bytes.byteLength === 0) throw new FieldValidationError({ file: 'Choose an image to upload' });
  if (data.bytes.byteLength > MAX_IMAGE_BYTES) throw new FieldValidationError({ file: 'Images can be at most 4 MB' });
  const image = sniffImage(data.bytes);
  if (!image || !HEADSHOT_TYPES.has(image.mimeType)) {
    throw new FieldValidationError({ file: 'Use a JPEG or PNG image (link previews can only show those)' });
  }
  const src = await store.put(`profile/headshot/${crypto.randomUUID()}.${image.ext}`, data.bytes, image.mimeType);
  let old: repo.StoredObject[];
  try {
    old = await withTransaction((tx) =>
      repo.setHeadshot(tx, { src, mimeType: image.mimeType, width: image.width, height: image.height }, data.translations, actor),
    );
  } catch (err) {
    await removeStoredFiles(store, [{ storage: 'blob', src }], log);
    throw err;
  }
  await removeStoredFiles(store, old, log);
  return loadHeadshot();
}

export async function saveHeadshotText(data: HeadshotTextInput, actor: repo.Actor): Promise<HeadshotValues> {
  await withTransaction((tx) => repo.updateHeadshotText(tx, data.translations, actor));
  return loadHeadshot();
}

export async function removeHeadshot(actor: repo.Actor, store: MediaStore = blobStore): Promise<HeadshotValues> {
  const old = await withTransaction((tx) => repo.clearHeadshot(tx, actor));
  await removeStoredFiles(store, old, log);
  return loadHeadshot();
}

/** Translation coverage of every profile-owned entity, per non-default locale (dashboard). */
export async function getProfileTranslationCoverage(): Promise<Record<Exclude<Locale, 'en'>, TranslationCoverage>> {
  const [details, roles, highlights, metrics] = await Promise.all([
    loadProfileDetails(),
    loadProfileRoles(),
    loadProfileHighlights(),
    loadSnapshotMetrics(),
  ]);
  const groups = [
    { schema: profileTranslationInput, items: [details.translations] },
    { schema: roleTranslationInput, items: roles.map((r) => r.translations) },
    {
      schema: highlightTranslationInput,
      items: [...highlights.differentiator, ...highlights.resume].map((h) => h.translations),
    },
    { schema: metricTranslationInput, items: metrics.map((m) => m.translations) },
  ];
  const coverage = (locale: Locale) =>
    groups
      .map((g) => translationCoverage(g.schema, g.items, locale))
      .reduce((a, b) => ({ complete: a.complete + b.complete, partial: a.partial + b.partial, missing: a.missing + b.missing }));
  return Object.fromEntries(LOCALES.filter((l) => l !== DEFAULT_LOCALE).map((l) => [l, coverage(l)])) as Record<
    Exclude<Locale, 'en'>,
    TranslationCoverage
  >;
}
