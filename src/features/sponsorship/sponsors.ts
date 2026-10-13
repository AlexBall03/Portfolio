import type { GithubSponsorship } from '@/integrations/github/schemas';
import type { HiddenSponsor, Sponsor, SponsorshipSettings, SponsorSort } from './types';

/**
 * Sponsor rules, as pure functions: which sponsorships are eligible, which the
 * admin hid, in what order they appear, and which parts of the feature are on.
 */

const SPONSORS_URL = /^https:\/\/github\.com\/sponsors\/([a-z\d](?:[a-z\d]|-(?=[a-z\d])){0,38})\/?$/i;

/** The account a GitHub Sponsors address belongs to, or null when it isn't one. */
export function sponsorLogin(url: string): string | null {
  return SPONSORS_URL.exec(url.trim())?.[1] ?? null;
}

/**
 * GitHub's sponsorships as sponsors the site may show: active and explicitly
 * public only (the request already excludes private ones; this is the second
 * check), one entry per account.
 */
export function normalizeSponsors(sponsorships: readonly GithubSponsorship[]): Sponsor[] {
  const seen = new Set<number>();
  const sponsors: Sponsor[] = [];
  for (const s of sponsorships) {
    if (s.privacyLevel !== 'PUBLIC' || !s.isActive) continue;
    const e = s.sponsorEntity;
    if (seen.has(e.databaseId)) continue;
    seen.add(e.databaseId);
    sponsors.push({
      id: e.databaseId,
      login: e.login,
      name: e.name?.trim() || null,
      avatarUrl: e.avatarUrl,
      url: e.url,
      kind: e.__typename === 'Organization' ? 'organization' : 'user',
      since: s.createdAt && !Number.isNaN(Date.parse(s.createdAt)) ? s.createdAt : null,
    });
  }
  return sponsors;
}

/** Without the sponsors the admin hid (matched by stable id, so a renamed account stays hidden). */
export function visibleSponsors(sponsors: readonly Sponsor[], hidden: readonly HiddenSponsor[]): Sponsor[] {
  const ids = new Set(hidden.map((h) => h.githubId));
  return sponsors.filter((s) => !ids.has(s.id));
}

export const sponsorName = (s: Pick<Sponsor, 'name' | 'login'>) => s.name ?? s.login;

const byName = (a: Sponsor, b: Sponsor) =>
  sponsorName(a).localeCompare(sponsorName(b), 'en', { sensitivity: 'base' }) || a.login.localeCompare(b.login, 'en');

/** A new array in the chosen order. A sponsorship with no date sorts after the dated ones, by name. */
export function sortSponsors(sponsors: readonly Sponsor[], order: SponsorSort): Sponsor[] {
  if (order === 'alphabetical') return [...sponsors].sort(byName);
  const direction = order === 'newest' ? -1 : 1;
  return [...sponsors].sort((a, b) => {
    if (!a.since || !b.since) return a.since ? -1 : b.since ? 1 : byName(a, b);
    return direction * (Date.parse(a.since) - Date.parse(b.since)) || byName(a, b);
  });
}

/** The first `limit` sponsors and how many more there are. */
export function previewOf(sponsors: readonly Sponsor[], limit: number): { shown: Sponsor[]; more: number } {
  const shown = sponsors.slice(0, Math.max(0, limit));
  return { shown, more: sponsors.length - shown.length };
}

/** Which parts of the feature are on. The master switch is applied here and nowhere else. */
export function sponsorshipVisibility(settings: Pick<SponsorshipSettings, 'enabled' | 'showHomeSection' | 'supportPageEnabled' | 'showSponsors'>) {
  return {
    home: settings.enabled && settings.showHomeSection,
    supportPage: settings.enabled && settings.supportPageEnabled,
    sponsors: settings.enabled && settings.showSponsors,
  };
}
