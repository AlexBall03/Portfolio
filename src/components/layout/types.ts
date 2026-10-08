import type { IconName } from '@/components/ui/Icon';
import type { SocialLink, SocialPlatform } from '@/features/profile/types';
import type { PageKey } from '@/features/site/types';
import type { Locale } from '@/i18n/config';
import type { Dictionary } from '@/i18n/get-dictionary';

export interface NavPage {
  key: PageKey;
  href: string;
  label: string;
  icon: IconName;
  description: string | null;
}

/** Serializable data the server layout hands to the client chrome. */
export interface ChromeData {
  locale: Locale;
  brandMark: string;
  pages: NavPage[];
  email: string;
  /** The published resume's public URL and file name; null when none is published. */
  resume: { href: string; fileName: string } | null;
  socials: SocialLink[];
  dict: Pick<Dictionary, 'nav' | 'palette' | 'toggles' | 'footer'>;
}

export const PLATFORM_ICONS: Record<SocialPlatform, IconName> = {
  github: 'github',
  linkedin: 'linkedin',
  x: 'globe',
  youtube: 'globe',
  instagram: 'globe',
  website: 'globe',
};
