import 'server-only';
import { getDb, withTransaction } from '@/db/client';
import { DEFAULT_LOCALE, LOCALES, type Locale } from '@/i18n/config';
import { translationCoverage, type TranslationCoverage } from '@/lib/cms/locale';
import * as repo from './repository';
import { experienceTranslationInput, type ExperiencesInput } from './schema';
import type { ExperiencesValues } from './types';

/**
 * Experience administration. Input is validated and the caller authorized;
 * no React or HTTP here. One save is one transaction, then the stored state
 * is returned so the editor resets to exactly what was saved.
 */

export async function loadExperiences(): Promise<ExperiencesValues> {
  return repo.listExperienceValues(await getDb());
}

export async function saveExperiences(data: ExperiencesInput, actor: { userId: string }): Promise<ExperiencesValues> {
  await withTransaction(async (tx) => {
    await repo.replaceExperiences(tx, 'career', data.career, actor);
    await repo.replaceExperiences(tx, 'education', data.education, actor);
  });
  return loadExperiences();
}

/** Translation coverage of every entry, per non-default locale (dashboard). */
export async function getExperienceTranslationCoverage(): Promise<Record<Exclude<Locale, 'en'>, TranslationCoverage>> {
  const { career, education } = await loadExperiences();
  const items = [...career, ...education].map((e) => e.translations);
  return Object.fromEntries(
    LOCALES.filter((l) => l !== DEFAULT_LOCALE).map((l) => [l, translationCoverage(experienceTranslationInput, items, l)]),
  ) as Record<Exclude<Locale, 'en'>, TranslationCoverage>;
}
