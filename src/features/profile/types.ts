import type { Accent } from '@/features/skills/types';
import type { MediaAsset } from '@/lib/media';

export type SocialPlatform = 'github' | 'linkedin' | 'x' | 'youtube' | 'instagram' | 'website';

export interface Profile {
  fullName: string;
  shortName: string;
  email: string;
  openToWork: boolean;
  timeZone: string;
  addressRegion: string | null;
  addressCountry: string | null;
  headshot: MediaAsset | null;
  title: string;
  statement: string;
  availabilityText: string;
  locationLabel: string;
  about: string[];
  hero: { focus: string; stackLine: string; chips: string[] };
}

export interface SocialLink {
  platform: SocialPlatform;
  label: string;
  url: string;
  handle: string | null;
}

export interface ProfileRole {
  label: string;
  accent: Accent;
}

export interface Highlight {
  icon: string | null;
  title: string;
  body: string;
}

export type SnapshotMetricSource = 'static' | 'published_projects' | 'technologies';

export interface SnapshotMetric {
  icon: string;
  /** `static` metrics show `value`; derived ones are counted from published content. */
  source: SnapshotMetricSource;
  value: number;
  suffix: string;
  accent: Accent;
  label: string;
  note: string;
}

/* ── Admin editor values ────────────────────────────────────────────────────
 * What the editors load and submit: hidden rows included, optional fields as
 * '' rather than null. List items carry a stable client `key` (the row id
 * once saved).
 */

/** Headshot editor values: the current photo (null when none) and its alt text. */
export interface HeadshotValues {
  photo: { src: string; width: number | null; height: number | null; uploaded: boolean } | null;
  alt: string;
}

export interface ProfileDetailsValues {
  fullName: string;
  shortName: string;
  email: string;
  openToWork: boolean;
  timeZone: string;
  addressRegion: string;
  addressCountry: string;
  title: string;
  statement: string;
  availabilityText: string;
  locationLabel: string;
  about: string[];
  heroFocus: string;
  heroStackLine: string;
  heroChips: string[];
}

interface ListItemValues {
  key: string;
  id?: string;
  visible: boolean;
}

export interface RoleValues extends ListItemValues {
  accent: Accent;
  label: string;
}

export interface HighlightValues extends ListItemValues {
  icon: string;
  title: string;
  body: string;
}

export type HighlightKind = 'differentiator' | 'resume';

export type HighlightsValues = Record<HighlightKind, HighlightValues[]>;

export interface MetricValues extends ListItemValues {
  icon: string;
  source: SnapshotMetricSource;
  value: number;
  suffix: string;
  accent: Accent;
  label: string;
  note: string;
}

export interface SocialLinkValues {
  key: string;
  id?: string;
  platform: SocialPlatform;
  label: string;
  url: string;
  handle: string;
  visible: boolean;
}
