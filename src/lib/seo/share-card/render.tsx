import 'server-only';
import { cacheLife, cacheTag } from 'next/cache';
import { ImageResponse } from 'next/og';
import { PAGES } from '@/config/navigation';
import { SHARE_CARD_SIZE, SITE_URL } from '@/config/site';
import { displayName } from '@/features/profile/display-name';
import { getProfile } from '@/features/profile/queries';
import type { Profile } from '@/features/profile/types';
import { hueFor } from '@/features/projects/identity';
import { getProjectBySlug } from '@/features/projects/queries';
import { getPageContent, getSection, getSiteSettings } from '@/features/site/queries';
import type { PageKey, SectionKey } from '@/features/site/types';
import type { Locale } from '@/i18n/config';
import { getDictionary } from '@/i18n/get-dictionary';
import { CACHE_LIFE, CACHE_TAGS } from '@/lib/cache-tags';
import { loadFonts, loadImage } from './assets';
import { clip, type ShareCard } from './card';
import { HomeCard, PageCard, ProjectCard } from './cards';

const DOMAIN = new URL(SITE_URL).host;

/** The section whose heading a top-level page's card borrows. */
const PAGE_SECTION: Record<Exclude<PageKey, 'home'>, SectionKey> = {
  about: 'about',
  projects: 'projects',
  experience: 'experience',
  resume: 'resume',
  contact: 'contact',
};

/*
 * Character budgets below are safety limits for unusually long copy, not
 * layout widths: typical text is shown in full (the cards step font sizes
 * down and wrap), and only text past these limits is cut with an ellipsis.
 */
const availability = (profile: Profile) => (profile.openToWork ? clip(profile.availabilityText, 64) : null);

/**
 * A share card as PNG bytes, or null when the card names nothing (unknown
 * project). Cached with the tags of everything it reads, so an admin save
 * refreshes the cards exactly as it refreshes the pages.
 */
export async function renderShareCard(locale: Locale, card: ShareCard): Promise<Uint8Array | null> {
  'use cache';
  cacheLife(CACHE_LIFE.content);
  cacheTag(CACHE_TAGS.profile, CACHE_TAGS.site, CACHE_TAGS.projects);

  const element = await cardElement(locale, card);
  if (!element) return null;
  const response = new ImageResponse(element, { ...SHARE_CARD_SIZE, fonts: await loadFonts() });
  return new Uint8Array(await response.arrayBuffer());
}

async function cardElement(locale: Locale, card: ShareCard) {
  const dict = getDictionary(locale);
  const [profile, settings] = await Promise.all([getProfile(locale), getSiteSettings()]);

  if (card.kind === 'project') {
    let lookup = await getProjectBySlug(card.slug, locale);
    if (lookup.kind === 'redirect') lookup = await getProjectBySlug(lookup.slug, locale);
    if (lookup.kind !== 'found') return null;
    const project = lookup.project;
    return (
      <ProjectCard
        label={dict.projects.project}
        name={clip(project.name, 60)}
        tagline={clip(project.tagline, 200)}
        technologies={project.technologies.slice(0, 6).map((t) => clip(t.name, 28))}
        cover={await loadImage(project.cover)}
        hue={hueFor(project.slug)}
        live={project.isLive ? dict.projects.live : null}
        brandMark={settings.brandMark}
        domain={DOMAIN}
      />
    );
  }

  const headshot = await loadImage(profile.headshot);

  if (card.page === 'home') {
    return (
      <HomeCard
        name={displayName(profile.fullName)}
        fullName={profile.fullName}
        title={clip(profile.title, 60)}
        statement={clip(profile.statement, 220)}
        availability={availability(profile)}
        meta={[
          { label: dict.hero.focusLabel, value: clip(profile.hero.focus, 44) },
          { label: dict.hero.stackLabel, value: clip(profile.hero.stackLine, 52) },
          { label: dict.hero.basedLabel, value: clip(profile.locationLabel, 36) },
        ]}
        headshot={headshot}
        chips={clip(profile.hero.chips.join(' · '), 80)}
        monogram={settings.monogram}
      />
    );
  }

  const [content, section] = await Promise.all([
    getPageContent(card.page, locale),
    getSection(PAGE_SECTION[card.page], locale),
  ]);
  const label = dict.nav[card.page];
  const index = String(PAGES.findIndex((p) => p.key === card.page)).padStart(2, '0');
  return (
    <PageCard
      index={index}
      label={label}
      title={clip(section.title || content?.seoTitle || label, 80)}
      description={clip(content?.seoDescription || section.subtitle || profile.statement, 260)}
      brandMark={settings.brandMark}
      domain={DOMAIN}
      fullName={profile.fullName}
      role={clip(profile.title, 80)}
      availability={availability(profile)}
      headshot={headshot}
    />
  );
}
