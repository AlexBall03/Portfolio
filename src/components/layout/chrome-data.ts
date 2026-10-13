import 'server-only';
import { copy } from '@/config/copy';
import { PAGES, SUPPORT_PATH } from '@/config/navigation';
import { getProfile, getSocialLinks } from '@/features/profile/queries';
import { getPublishedResume } from '@/features/resume/queries';
import { getPageContent, getSiteSettings } from '@/features/site/queries';
import { getSponsorshipSettings } from '@/features/sponsorship/queries';
import { sponsorshipVisibility } from '@/features/sponsorship/sponsors';
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

/** The support page's entry, or null while the page is switched off. */
async function getSupportPage(): Promise<NavPage | null> {
  const [sponsorship, content] = await Promise.all([getSponsorshipSettings(), getPageContent('support')]);
  if (!sponsorshipVisibility(sponsorship).supportPage) return null;
  return {
    key: 'support',
    href: SUPPORT_PATH,
    label: copy.nav.support,
    icon: 'heart',
    description: content?.seoDescription ?? copy.sponsorship.seoDescription,
  };
}

export async function getChromeData(): Promise<ChromeData> {
  const [settings, profile, socials, pages, support, resume] = await Promise.all([
    getSiteSettings(),
    getProfile(),
    getSocialLinks(),
    getNavPages(),
    getSupportPage(),
    getPublishedResume(),
  ]);
  return {
    brandMark: settings.brandMark,
    pages,
    support,
    email: profile.email,
    resume: resume && { href: resume.href, fileName: resume.fileName },
    socials,
  };
}
