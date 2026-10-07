import { z } from 'zod';
import { experienceInput } from '@/features/experience/schema';
import {
  highlightInput,
  profileInput,
  profileRoleInput,
  snapshotMetricInput,
  socialLinkInput,
} from '@/features/profile/schema';
import { projectInput, technologyInput } from '@/features/projects/schema';
import { pagesInput, sectionsInput, siteSettingsInput } from '@/features/site/schema';
import { skillCategoryInput } from '@/features/skills/schema';

/** A complete portfolio content document, validated as a whole before seeding. */
export const contentSeedSchema = z
  .object({
    settings: siteSettingsInput,
    profile: profileInput,
    socialLinks: z.array(socialLinkInput),
    roles: z.array(profileRoleInput),
    highlights: z.array(highlightInput),
    metrics: z.array(snapshotMetricInput),
    pages: pagesInput,
    sections: sectionsInput,
    technologies: z.array(technologyInput),
    skillCategories: z.array(skillCategoryInput),
    projects: z.array(projectInput),
    experiences: z.array(experienceInput),
  })
  .superRefine((doc, ctx) => {
    const known = new Set(doc.technologies.map((t) => t.slug));
    if (known.size !== doc.technologies.length) {
      ctx.addIssue({ code: 'custom', path: ['technologies'], message: 'Duplicate technology slug' });
    }
    const check = (slugs: string[], path: (string | number)[]) => {
      for (const s of slugs) {
        if (!known.has(s)) ctx.addIssue({ code: 'custom', path, message: `Unknown technology "${s}"` });
      }
    };
    doc.skillCategories.forEach((c, i) => check(c.technologies, ['skillCategories', i, 'technologies']));
    doc.projects.forEach((p, i) => check(p.technologies, ['projects', i, 'technologies']));

    const projectSlugs = doc.projects.map((p) => p.slug);
    if (new Set(projectSlugs).size !== projectSlugs.length) {
      ctx.addIssue({ code: 'custom', path: ['projects'], message: 'Duplicate project slug' });
    }
  });

export type ContentSeed = z.output<typeof contentSeedSchema>;
