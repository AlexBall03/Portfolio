import 'server-only';
import { authEnv, blobEnv, contactEnv, githubEnv, privateBlobEnv } from '@/config/env';
import { getExperiences } from '@/features/experience/queries';
import { getExperienceTranslationCoverage } from '@/features/experience/service';
import { getSocialLinks } from '@/features/profile/queries';
import { getPublishedResume } from '@/features/resume/queries';
import { getProfileTranslationCoverage } from '@/features/profile/service';
import { getProjects } from '@/features/projects/queries';
import { getSkills } from '@/features/skills/queries';
import { getSkillsTranslationCoverage } from '@/features/skills/service';
import { getSiteCopyTranslationCoverage } from '@/features/site/service';
import { DEFAULT_LOCALE } from '@/i18n/config';
import type { TranslationCoverage } from '@/lib/cms/locale';

/**
 * Facts for the admin dashboard. Everything is read from real configuration
 * or published content; nothing is estimated or invented.
 */

export type DeploymentEnvironment = 'production' | 'preview' | 'development';

export interface DeploymentOverview {
  environment: DeploymentEnvironment;
  branch: string | null;
  commit: string | null;
  /** ISO time of the build that is serving this request. */
  builtAt: string | null;
  clerkInstance: 'development' | 'production';
  integrations: { label: string; configured: boolean }[];
}

const configured = (read: () => unknown) => {
  try {
    read();
    return true;
  } catch {
    return false;
  }
};

export function getDeploymentOverview(): DeploymentOverview {
  const vercelEnv = process.env.VERCEL_ENV;
  const environment: DeploymentEnvironment =
    vercelEnv === 'production' || vercelEnv === 'preview' ? vercelEnv : 'development';
  return {
    environment,
    branch: process.env.VERCEL_GIT_COMMIT_REF || null,
    commit: process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) || null,
    builtAt: process.env.BUILD_TIME || null,
    clerkInstance: authEnv().instance,
    integrations: [
      { label: 'GitHub', configured: configured(githubEnv) },
      { label: 'Resend (contact form)', configured: configured(contactEnv) },
      { label: 'Vercel Blob (project images)', configured: configured(blobEnv) },
      { label: 'Vercel Blob, private (resumes)', configured: configured(privateBlobEnv) },
    ],
  };
}

export interface ContentOverview {
  publishedProjects: number;
  skillCategories: number;
  career: number;
  education: number;
  socialLinks: number;
  /** The published resume's file name; null when none is published. */
  resume: string | null;
}

/** Counts of what the public site currently shows (same cached reads as the pages). */
export async function getContentOverview(): Promise<ContentOverview> {
  const [projects, skills, experiences, socials, resume] = await Promise.all([
    getProjects(DEFAULT_LOCALE),
    getSkills(DEFAULT_LOCALE),
    getExperiences(DEFAULT_LOCALE),
    getSocialLinks(),
    getPublishedResume(),
  ]);
  return {
    publishedProjects: projects.length,
    skillCategories: skills.stack.length + skills.learning.length,
    career: experiences.filter((e) => e.kind === 'career').length,
    education: experiences.filter((e) => e.kind === 'education').length,
    socialLinks: socials.length,
    resume: resume?.fileName ?? null,
  };
}

export type SpanishCoverage = TranslationCoverage & { total: number };

const spanish = ({ es }: { es: TranslationCoverage }): SpanishCoverage => ({
  ...es,
  total: es.complete + es.partial + es.missing,
});

/** Spanish coverage of each editor's bilingual content (uncached: what the editors would show). */
export async function getTranslationOverview() {
  const [profile, skills, experience, pages] = await Promise.all([
    getProfileTranslationCoverage(),
    getSkillsTranslationCoverage(),
    getExperienceTranslationCoverage(),
    getSiteCopyTranslationCoverage(),
  ]);
  return {
    profile: spanish(profile),
    skills: spanish(skills),
    experience: spanish(experience),
    pages: spanish(pages),
  };
}
