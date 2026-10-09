import 'server-only';
import { copy } from '@/config/copy';
import { PAGES } from '@/config/navigation';
import { getProfile, getSocialLinks } from '@/features/profile/queries';
import { getPublishedResume } from '@/features/resume/queries';
import { getPageContent, getSiteSettings } from '@/features/site/queries';
import type { ChromeData, NavPage } from './types';

/** Navigation entries: labels from the UI copy, descriptions from the DB. */
export async function getNavPages(): Promise<NavPage[]> {
  const contents = await Promise.all(PAGES.map((p) => getPageContent(p.key)));
  return PAGES.map((p, i) => ({
    key: p.key,
    href: p.path,
    label: copy.nav[p.key],
    icon: p.icon,
    description: contents[i]?.seoDescription ?? null,
  }));
}

export async function getChromeData(): Promise<ChromeData> {
  const [settings, profile, socials, pages, resume] = await Promise.all([
    getSiteSettings(),
    getProfile(),
    getSocialLinks(),
    getNavPages(),
    getPublishedResume(),
  ]);
  return {
    brandMark: settings.brandMark,
    pages,
    email: profile.email,
    resume: resume && { href: resume.href, fileName: resume.fileName },
    socials,
  };
}
