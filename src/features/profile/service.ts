import 'server-only';
import { getDb, withTransaction } from '@/db/client';
import { DEFAULT_LOCALE, LOCALES, type Locale } from '@/i18n/config';
import { translationCoverage, type TranslationCoverage } from '@/lib/cms/locale';
import { ContentMissingError } from '@/lib/errors';
import * as repo from './repository';
import {
  highlightTranslationInput,
  metricTranslationInput,
  profileTranslationInput,
  roleTranslationInput,
  type ProfileDetailsInput,
  type ProfileHighlightsInput,
  type ProfileRolesInput,
  type SnapshotMetricsInput,
} from './schema';
import type { HighlightsValues, MetricValues, ProfileDetailsValues, RoleValues } from './types';

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
