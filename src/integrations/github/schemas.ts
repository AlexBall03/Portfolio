import { z } from 'zod';

/**
 * Validated shapes of the GitHub API responses this app reads. Only the fields
 * actually used are declared; everything else is ignored, so unrelated upstream
 * changes don't break parsing. Payloads trimmed by GitHub (see the Oct 2025
 * Events API change) are modeled as optional.
 */

export const githubUserSchema = z.object({
  login: z.string(),
  name: z.string().nullable(),
  avatar_url: z.url(),
  html_url: z.url(),
  followers: z.number().int(),
});
export type GithubUser = z.infer<typeof githubUserSchema>;

export const githubRepoSchema = z.object({
  name: z.string(),
  full_name: z.string(),
  description: z.string().nullable(),
  html_url: z.url(),
  homepage: z.string().nullable().optional(),
  language: z.string().nullable(),
  stargazers_count: z.number().int(),
  forks_count: z.number().int(),
  fork: z.boolean(),
  archived: z.boolean(),
  pushed_at: z.string().nullable(),
});
export type GithubRepo = z.infer<typeof githubRepoSchema>;

export const githubEventSchema = z.object({
  type: z.string(),
  created_at: z.string(),
  repo: z.object({ name: z.string() }),
  payload: z
    .object({
      action: z.string().optional(),
      ref: z.string().nullable().optional(),
      ref_type: z.string().optional(),
      number: z.number().optional(),
      pull_request: z
        .object({ title: z.string().optional(), merged: z.boolean().optional(), number: z.number().optional() })
        .optional(),
      issue: z.object({ title: z.string().optional(), number: z.number().optional() }).optional(),
      release: z.object({ tag_name: z.string().optional(), name: z.string().nullable().optional() }).optional(),
    })
    .loose(),
});
export type GithubEvent = z.infer<typeof githubEventSchema>;

export const contributionLevelSchema = z.enum([
  'NONE',
  'FIRST_QUARTILE',
  'SECOND_QUARTILE',
  'THIRD_QUARTILE',
  'FOURTH_QUARTILE',
]);

export const contributionCalendarResponseSchema = z.object({
  data: z.object({
    user: z
      .object({
        contributionsCollection: z.object({
          contributionCalendar: z.object({
            totalContributions: z.number().int(),
            weeks: z.array(
              z.object({
                contributionDays: z.array(
                  z.object({
                    date: z.iso.date(),
                    contributionCount: z.number().int(),
                    contributionLevel: contributionLevelSchema,
                  }),
                ),
              }),
            ),
          }),
        }),
      })
      .nullable(),
  }),
});
export type ContributionCalendarResponse = z.infer<typeof contributionCalendarResponseSchema>;
