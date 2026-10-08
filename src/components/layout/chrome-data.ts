import 'server-only';
import { PAGES } from '@/config/navigation';
import { getProfile, getSocialLinks } from '@/features/profile/queries';
import { getPublishedResume } from '@/features/resume/queries';
import { getPageContent, getSiteSettings } from '@/features/site/queries';
import type { Locale } from '@/i18n/config';
import { getDictionary } from '@/i18n/get-dictionary';
import { localizedPath } from '@/i18n/paths';
import type { ChromeData, NavPage } from './types';

/** Navigation entries for a locale: labels from the dictionary, descriptions from the DB. */
export async function getNavPages(locale: Locale): Promise<NavPage[]> {
  const dict = getDictionary(locale);
  const contents = await Promise.all(PAGES.map((p) => getPageContent(p.key, locale)));
  return PAGES.map((p, i) => ({
    key: p.key,
    href: localizedPath(locale, p.path),
    label: dict.nav[p.key],
    icon: p.icon,
    description: contents[i]?.seoDescription ?? null,
  }));
}

export async function getChromeData(locale: Locale): Promise<ChromeData> {
  const dict = getDictionary(locale);
  const [settings, profile, socials, pages, resume] = await Promise.all([
    getSiteSettings(),
    getProfile(locale),
    getSocialLinks(),
    getNavPages(locale),
    getPublishedResume(),
  ]);
  return {
    locale,
    brandMark: settings.brandMark,
    pages,
    email: profile.email,
    resume: resume && { href: resume.href, fileName: resume.fileName },
    socials,
    dict: { nav: dict.nav, palette: dict.palette, toggles: dict.toggles, footer: dict.footer },
  };
}
