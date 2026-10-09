import 'server-only';
import { createHash } from 'node:crypto';
import { cacheLife, cacheTag } from 'next/cache';
import { PAGES } from '@/config/navigation';
import { SITE_URL } from '@/config/site';
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
import type { MediaAsset } from '@/lib/media';
import { clip, type ShareCard } from './card';
import type { HomeCardProps, PageCardProps, ProjectCardProps } from './cards';

const DOMAIN = new URL(SITE_URL).host;

/** Tags of everything a card reads: an admin save under any of them refreshes cards and their versions. */
export const SHARE_CARD_TAGS = [CACHE_TAGS.profile, CACHE_TAGS.site, CACHE_TAGS.projects] as const;

/** The section whose heading a top-level page's card borrows. */
const PAGE_SECTION: Record<Exclude<PageKey, 'home'>, SectionKey> = {
  about: 'about',
  projects: 'projects',
  experience: 'experience',
  resume: 'resume',
  contact: 'contact',
};

/**
 * Everything a card shows, as plain data: its text props plus the image it
 * embeds (still a reference; render.tsx loads the bytes). The single source for
 * both the rendered PNG and its version hash, so they can't disagree.
 */
export type CardSpec =
  | { kind: 'home'; props: Omit<HomeCardProps, 'headshot'>; image: MediaAsset | null }
  | { kind: 'page'; props: Omit<PageCardProps, 'headshot'>; image: MediaAsset | null }
  | { kind: 'project'; props: Omit<ProjectCardProps, 'cover'>; image: MediaAsset | null };

/*
 * Character budgets below are safety limits for unusually long copy, not
 * layout widths: typical text is shown in full (the cards step font sizes
 * down and wrap), and only text past these limits is cut with an ellipsis.
 */
const availability = (profile: Profile) => (profile.openToWork ? clip(profile.availabilityText, 64) : null);

/** A card's content, or null when the card names nothing (unknown or unpublished project). */
export async function cardInputs(locale: Locale, card: ShareCard): Promise<CardSpec | null> {
  const dict = getDictionary(locale);
  const [profile, settings] = await Promise.all([getProfile(locale), getSiteSettings()]);

  if (card.kind === 'project') {
    let lookup = await getProjectBySlug(card.slug, locale);
    if (lookup.kind === 'redirect') lookup = await getProjectBySlug(lookup.slug, locale);
    if (lookup.kind !== 'found') return null;
    const project = lookup.project;
    return {
      kind: 'project',
      image: project.cover,
      props: {
        label: dict.projects.project,
        name: clip(project.name, 60),
        tagline: clip(project.tagline, 200),
        technologies: project.technologies.slice(0, 6).map((t) => clip(t.name, 28)),
        hue: hueFor(project.slug),
        live: project.isLive ? dict.projects.live : null,
        brandMark: settings.brandMark,
        domain: DOMAIN,
      },
    };
  }

  // The home card is the person: it shows the profile (hero copy, headshot), which is
  // what the home page itself shows. Its SEO title/description stay in <head>.
  if (card.page === 'home') {
    return {
      kind: 'home',
      image: profile.headshot,
      props: {
        name: displayName(profile.fullName),
        fullName: profile.fullName,
        title: clip(profile.title, 60),
        statement: clip(profile.statement, 220),
        availability: availability(profile),
        meta: [
          { label: dict.hero.focusLabel, value: clip(profile.hero.focus, 44) },
          { label: dict.hero.stackLabel, value: clip(profile.hero.stackLine, 52) },
          { label: dict.hero.basedLabel, value: clip(profile.locationLabel, 36) },
        ],
        chips: clip(profile.hero.chips.join(' · '), 80),
        monogram: settings.monogram,
      },
    };
  }

  const [content, section] = await Promise.all([
    getPageContent(card.page, locale),
    getSection(PAGE_SECTION[card.page], locale),
  ]);
  const label = dict.nav[card.page];
  const index = String(PAGES.findIndex((p) => p.key === card.page)).padStart(2, '0');
  return {
    kind: 'page',
    image: profile.headshot,
    props: {
      index,
      label,
      title: clip(section.title || content?.seoTitle || label, 80),
      description: clip(content?.seoDescription || section.subtitle || profile.statement, 260),
      brandMark: settings.brandMark,
      domain: DOMAIN,
      fullName: profile.fullName,
      role: clip(profile.title, 80),
      availability: availability(profile),
    },
  };
}

/**
 * A short, stable fingerprint of a card's content: its text and the image it
 * embeds (by URL; uploads get a fresh URL, never an overwrite). Pure.
 */
export function cardFingerprint(spec: CardSpec): string {
  const image = spec.image ? spec.image.src : null;
  return createHash('sha256')
    .update(JSON.stringify([spec.kind, spec.props, image]))
    .digest('base64url')
    .slice(0, 10);
}

/**
 * The version a page puts on its share-card URL (`?v=`). Cached under the same
 * tags as the card, so editing anything the card shows changes the URL in the
 * page's regenerated metadata and social platforms re-scrape the image.
 */
export async function shareCardVersion(locale: Locale, card: ShareCard): Promise<string | null> {
  'use cache';
  cacheLife(CACHE_LIFE.content);
  cacheTag(...SHARE_CARD_TAGS);
  const spec = await cardInputs(locale, card);
  return spec ? cardFingerprint(spec) : null;
}
