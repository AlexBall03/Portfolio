import { z } from 'zod';
import { accent, icon, localized, mediaInput, text, url } from '@/lib/validation';

export const profileInput = z.object({
  fullName: text(120),
  shortName: text(80),
  email: z.email(),
  openToWork: z.boolean().default(true),
  timeZone: z.string().refine((tz) => {
    try {
      new Intl.DateTimeFormat('en', { timeZone: tz });
      return true;
    } catch {
      return false;
    }
  }, 'Unknown IANA time zone'),
  addressRegion: z.string().trim().max(100).nullish(),
  addressCountry: z.string().trim().length(2).nullish(),
  headshot: mediaInput.nullish(),
  resume: mediaInput.nullish(),
  translations: localized(
    z.object({
      title: text(120),
      statement: text(300),
      availabilityText: text(120),
      locationLabel: text(120),
      about: z.array(text(2000)).min(1),
      heroFocus: text(120),
      heroStackLine: text(160),
      heroChips: z.array(text(60)).max(4).default([]),
    }),
  ),
});
export type ProfileInput = z.infer<typeof profileInput>;

export const socialLinkInput = z.object({
  platform: z.enum(['github', 'linkedin', 'x', 'youtube', 'instagram', 'website']),
  label: text(40),
  url,
  handle: z.string().trim().max(80).nullish(),
  visible: z.boolean().default(true),
});
export type SocialLinkInput = z.infer<typeof socialLinkInput>;

export const profileRoleInput = z.object({
  accent: accent.default('blue'),
  visible: z.boolean().default(true),
  translations: localized(z.object({ label: text(80) })),
});
export type ProfileRoleInput = z.infer<typeof profileRoleInput>;

export const highlightInput = z.object({
  kind: z.enum(['differentiator', 'resume']),
  icon: icon.nullish(),
  visible: z.boolean().default(true),
  translations: localized(z.object({ title: text(120), body: text(600) })),
});
export type HighlightInput = z.infer<typeof highlightInput>;

export const snapshotMetricInput = z.object({
  icon,
  value: z.number().finite().nonnegative(),
  suffix: z.string().max(4).default(''),
  accent: accent.default('blue'),
  visible: z.boolean().default(true),
  translations: localized(z.object({ label: text(60), note: z.string().trim().max(120).default('') })),
});
export type SnapshotMetricInput = z.infer<typeof snapshotMetricInput>;
