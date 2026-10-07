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
  resume: MediaAsset | null;
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
