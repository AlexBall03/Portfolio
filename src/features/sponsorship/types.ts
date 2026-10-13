export const SPONSOR_SORTS = ['newest', 'oldest', 'alphabetical'] as const;
export type SponsorSort = (typeof SPONSOR_SORTS)[number];

/** A sponsor kept off the site. `githubId` is the identity; the login is only what the admin sees. */
export interface HiddenSponsor {
  githubId: number;
  login: string;
}

/** One thing sponsorship supports, listed on the support page. */
export interface SupportItem {
  title: string;
  body: string;
}

export interface SponsorshipSettings {
  /** Master switch for the whole feature. */
  enabled: boolean;
  showHomeSection: boolean;
  supportPageEnabled: boolean;
  heading: string;
  description: string;
  ctaLabel: string;
  sponsorsUrl: string;
  showSponsors: boolean;
  showSponsorCount: boolean;
  homeSponsorLimit: number;
  sponsorSort: SponsorSort;
  hiddenSponsors: HiddenSponsor[];
  supportTitle: string;
  supportIntro: string;
  supportItems: SupportItem[];
}

/** What the site shows until the settings are first saved in /admin/sponsorship. */
export const DEFAULT_SPONSORSHIP_SETTINGS: SponsorshipSettings = {
  enabled: true,
  showHomeSection: true,
  supportPageEnabled: true,
  heading: 'Support My Work',
  description:
    "I'm a software developer building practical web applications and tools, with much of my work in public repositories. " +
    'Your sponsorship helps support ongoing development, hosting, maintenance, and new projects, while also investing in my continued growth as a software engineer.',
  ctaLabel: 'Sponsor on GitHub',
  sponsorsUrl: 'https://github.com/sponsors/AlexBall03',
  showSponsors: true,
  showSponsorCount: false,
  homeSponsorLimit: 8,
  sponsorSort: 'newest',
  hiddenSponsors: [],
  supportTitle: 'Support my work',
  supportIntro:
    "I build and maintain web applications and developer tools, and I share much of that work publicly. If something I've made has been useful to you, " +
    'sponsoring me on GitHub is a direct way to help me keep building. Sponsorship is entirely optional, and every contribution is appreciated.',
  supportItems: [
    { title: 'Development and maintenance', body: 'Time to keep existing projects working, fix bugs, and ship improvements.' },
    { title: 'Hosting and infrastructure', body: 'Domains, hosting, databases, and the other services that keep projects online.' },
    { title: 'Tools and services', body: 'The development tools and subscriptions I use to build and test.' },
    { title: 'New projects', body: 'Room to start new ideas and take them further.' },
    { title: 'Professional growth', body: 'Courses, books, and practice that make me a better software engineer.' },
  ],
};

/** A public sponsor, as the site shows one. Nothing here is private: no tier, amount, or email is ever read. */
export interface Sponsor {
  /** GitHub's stable account id (users and organizations share one id space). */
  id: number;
  login: string;
  name: string | null;
  avatarUrl: string;
  url: string;
  kind: 'user' | 'organization';
  /** When the sponsorship began (ISO), or null when GitHub didn't say. */
  since: string | null;
}

/**
 * What GitHub answered, for the admin. `unconfigured`: no token.
 * `unauthorized`: the token was rejected or may not read sponsorships.
 * `unavailable`: anything transient or unexpected (`reason` is an error kind, never sponsor data).
 */
export type SponsorsResult =
  | { status: 'ok'; sponsors: Sponsor[]; fetchedAt: string }
  | { status: 'unconfigured' }
  | { status: 'unauthorized' }
  | { status: 'unavailable'; reason: string };

/**
 * What the public site may show. A failed read is `unavailable`, never an
 * empty list: "no sponsors" is only ever claimed when GitHub said so.
 */
export type SponsorList = { state: 'disabled' } | { state: 'unavailable' } | { state: 'ok'; sponsors: Sponsor[] };

/** Editor values: the stored settings, with a client key per support item. */
export type SponsorshipValues = Omit<SponsorshipSettings, 'supportItems'> & {
  supportItems: (SupportItem & { key: string })[];
};
