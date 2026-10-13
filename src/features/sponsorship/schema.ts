import { z } from 'zod';
import { text } from '@/lib/validation';
import { sponsorLogin } from './sponsors';
import { SPONSOR_SORTS } from './types';

export const MAX_HOME_SPONSORS = 24;
export const MAX_SUPPORT_ITEMS = 8;

/** Plain text only: rendered as text nodes, never as HTML. */
export const sponsorshipSettingsInput = z.object({
  enabled: z.boolean(),
  showHomeSection: z.boolean(),
  supportPageEnabled: z.boolean(),
  heading: text(120),
  description: text(600),
  ctaLabel: text(40),
  /** Only a GitHub Sponsors address: the CTA can't be pointed anywhere else. */
  sponsorsUrl: z
    .string()
    .trim()
    .refine((url) => sponsorLogin(url) !== null, 'Use a GitHub Sponsors address: https://github.com/sponsors/<username>'),
  showSponsors: z.boolean(),
  showSponsorCount: z.boolean(),
  /** A number input sends text. */
  homeSponsorLimit: z.coerce
    .number<number | string>('Enter a number')
    .int('Enter a whole number')
    .min(1, `Between 1 and ${MAX_HOME_SPONSORS}`)
    .max(MAX_HOME_SPONSORS, `Between 1 and ${MAX_HOME_SPONSORS}`),
  sponsorSort: z.enum(SPONSOR_SORTS),
  hiddenSponsors: z
    .array(z.object({ githubId: z.number().int().positive(), login: text(39) }))
    .max(200)
    // One entry per account.
    .transform((list) => list.filter((h, i) => list.findIndex((o) => o.githubId === h.githubId) === i)),
  supportTitle: text(120),
  supportIntro: text(600),
  supportItems: z.array(z.object({ title: text(80), body: text(300) })).max(MAX_SUPPORT_ITEMS),
});
export type SponsorshipSettingsInput = z.infer<typeof sponsorshipSettingsInput>;
