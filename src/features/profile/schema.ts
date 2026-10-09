import { z } from 'zod';
import { isIconName } from '@/components/ui/icons';
import { accent, blankToNull, icon, localized, mediaInput, nullableText, text, url } from '@/lib/validation';

export const profileTranslationInput = z.object({
  title: text(120),
  statement: text(300),
  availabilityText: text(120),
  locationLabel: text(120),
  about: z.array(text(2000)).min(1, 'Add at least one paragraph'),
  heroFocus: text(120),
  heroStackLine: text(160),
  heroChips: z.array(text(60)).max(4, 'At most 4 chips').default([]),
});

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
  translations: localized(profileTranslationInput),
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

export const roleTranslationInput = z.object({ label: text(80) });

export const profileRoleInput = z.object({
  accent: accent.default('blue'),
  visible: z.boolean().default(true),
  translations: localized(roleTranslationInput),
});
export type ProfileRoleInput = z.infer<typeof profileRoleInput>;

export const highlightTranslationInput = z.object({ title: text(120), body: text(600) });

export const highlightInput = z.object({
  kind: z.enum(['differentiator', 'resume']),
  icon: icon.nullish(),
  visible: z.boolean().default(true),
  translations: localized(highlightTranslationInput),
});
export type HighlightInput = z.infer<typeof highlightInput>;

export const metricTranslationInput = z.object({
  label: text(60),
  note: z.string().trim().max(120, 'At most 120 characters').default(''),
});

export const snapshotMetricInput = z.object({
  icon,
  source: z.enum(['static', 'published_projects', 'technologies']).default('static'),
  /** Ignored when `source` is derived; stored so switching back to static has a value. */
  value: z.number().finite().nonnegative(),
  suffix: z.string().max(4).default(''),
  accent: accent.default('blue'),
  visible: z.boolean().default(true),
  translations: localized(metricTranslationInput),
});
export type SnapshotMetricInput = z.infer<typeof snapshotMetricInput>;

/* ── Admin editors ──────────────────────────────────────────────────────────
 * The editor schemas reuse the content schemas above (which the seed also
 * uses) and adapt them to form input: list items carry their row id (absent
 * for new items), blank optional inputs become null.
 */

const iconName = z.string().trim().refine(isIconName, 'Choose an icon from the set');
const rowId = z.uuid().optional();

export const profileDetailsInput = profileInput.omit({ headshot: true }).extend({
  addressRegion: nullableText(100),
  addressCountry: blankToNull(
    z
      .string()
      .trim()
      .regex(/^[a-z]{2}$/i, 'Use a two-letter country code, e.g. US')
      .transform((c) => c.toUpperCase())
      .nullish(),
  ),
});
export type ProfileDetailsInput = z.infer<typeof profileDetailsInput>;

export const profileRolesInput = z.object({
  items: z.array(profileRoleInput.extend({ id: rowId })).max(12, 'At most 12 roles'),
});
export type ProfileRolesInput = z.infer<typeof profileRolesInput>;

const highlightItem = highlightInput.omit({ kind: true }).extend({ id: rowId, icon: blankToNull(iconName.nullish()) });
export const profileHighlightsInput = z.object({
  differentiator: z.array(highlightItem).max(12, 'At most 12 cards'),
  resume: z.array(highlightItem).max(12, 'At most 12 highlights'),
});
export type ProfileHighlightsInput = z.infer<typeof profileHighlightsInput>;

export const snapshotMetricsInput = z.object({
  items: z
    .array(
      snapshotMetricInput.extend({
        id: rowId,
        icon: iconName,
        value: z.number('Enter a number').finite().nonnegative('Must be zero or more'),
      }),
    )
    .max(8, 'At most 8 metrics'),
});
export type SnapshotMetricsInput = z.infer<typeof snapshotMetricsInput>;

/** Public profile links. http(s) only, so no `javascript:` or other scheme reaches an href. */
export const socialLinksInput = z.object({
  items: z
    .array(socialLinkInput.extend({ id: rowId, url: z.url({ protocol: /^https?$/, error: 'Enter a full http(s) URL' }), handle: nullableText(80) }))
    .max(12, 'At most 12 links'),
});
export type SocialLinksInput = z.infer<typeof socialLinksInput>;

/* ── Headshot ───────────────────────────────────────────────────────────────
 * The photo itself is uploaded through a Route Handler (multipart `file`,
 * `alt.<locale>`); its alt text is also editable on its own.
 */

export const headshotTranslationInput = z.object({ alt: text(300) });

/** The headshot's alt text: required in English, optional (all or nothing) per other locale. */
export const headshotTextInput = z.object({ translations: localized(headshotTranslationInput) });
export type HeadshotTextInput = z.infer<typeof headshotTextInput>;
