/**
 * The case-study vocabulary: which section kinds exist, which fields each one
 * uses, and the milestone kinds. Shared by validation (server), the editors
 * (browser), and the public renderers, so the three can't disagree. The
 * database stores only the kind; this map decides what it means.
 */

export const SECTION_KINDS = [
  'narrative',
  'highlights',
  'architecture',
  'challenges',
  'lessons',
  'outcomes',
  'gallery',
  'video',
] as const;
export type SectionKind = (typeof SECTION_KINDS)[number];

export interface SectionSpec {
  /** Admin label (the admin is English-only). Public defaults come from the dictionaries. */
  label: string;
  description: string;
  /** Paragraphs: required, optional (an intro or caption), or not used. */
  body: 'required' | 'optional' | false;
  /** A list of entries, with the admin's names for an entry's two fields. */
  items: { noun: string; title: string; body: string } | false;
  /** Images chosen from the project's own media. */
  media: 'required' | 'optional' | false;
  video: boolean;
}

export const SECTION_SPECS: Record<SectionKind, SectionSpec> = {
  narrative: {
    label: 'Narrative',
    description: 'Free-form story: context, motivation, approach.',
    body: 'required',
    items: false,
    media: false,
    video: false,
  },
  highlights: {
    label: 'Highlights',
    description: 'Key features or technical highlights, with an optional intro.',
    body: 'optional',
    items: { noun: 'highlight', title: 'Highlight', body: 'Detail (optional)' },
    media: false,
    video: false,
  },
  architecture: {
    label: 'Architecture',
    description: 'How the system fits together, with optional diagrams.',
    body: 'required',
    items: false,
    media: 'optional',
    video: false,
  },
  challenges: {
    label: 'Challenges & solutions',
    description: 'Engineering problems and how they were solved.',
    body: 'optional',
    items: { noun: 'challenge', title: 'Challenge', body: 'Solution' },
    media: false,
    video: false,
  },
  lessons: {
    label: 'Lessons learned',
    description: 'What the project taught, as a numbered list.',
    body: 'optional',
    items: { noun: 'lesson', title: 'Lesson', body: 'Detail (optional)' },
    media: false,
    video: false,
  },
  outcomes: {
    label: 'Results',
    description: 'Outcomes and measurable results. Lead with the figure ("40% faster").',
    body: 'optional',
    items: { noun: 'result', title: 'Result', body: 'Detail (optional)' },
    media: false,
    video: false,
  },
  gallery: {
    label: 'Gallery',
    description: 'A curated set of the project’s images.',
    body: 'optional',
    items: false,
    media: 'required',
    video: false,
  },
  video: {
    label: 'Video',
    description: 'An externally hosted video (YouTube or Vimeo embed, any other URL as a link).',
    body: 'optional',
    items: false,
    media: false,
    video: true,
  },
};

export const MILESTONE_KINDS = ['started', 'feature', 'release', 'launch', 'refactor', 'other'] as const;
export type MilestoneKind = (typeof MILESTONE_KINDS)[number];

export const MILESTONE_PRECISIONS = ['day', 'month', 'year'] as const;
export type MilestonePrecision = (typeof MILESTONE_PRECISIONS)[number];

export const MAX_SECTIONS = 20;
export const MAX_SECTION_ITEMS = 12;
export const MAX_SECTION_MEDIA = 24;
export const MAX_MILESTONES = 60;
export const MAX_RELATED = 6;

export type VideoEmbed = { kind: 'embed'; src: string; provider: 'YouTube' | 'Vimeo' } | { kind: 'link'; href: string };

/**
 * How a video URL is shown: YouTube and Vimeo become a privacy-friendly
 * embed (built from the parsed id only, never the raw URL); anything else is
 * a plain link. Callers pass URLs already validated as http(s).
 */
export function videoEmbed(raw: string): VideoEmbed {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return { kind: 'link', href: raw };
  }
  const host = url.hostname.replace(/^www\.|^m\./, '');
  const id = /^[A-Za-z0-9_-]{6,20}$/;
  let youtube: string | null = null;
  if (host === 'youtu.be') youtube = url.pathname.slice(1);
  else if (host === 'youtube.com' || host === 'youtube-nocookie.com') {
    youtube = url.pathname === '/watch' ? url.searchParams.get('v') : (/^\/(?:embed|shorts|live)\/([^/]+)/.exec(url.pathname)?.[1] ?? null);
  }
  if (youtube && id.test(youtube)) {
    return { kind: 'embed', provider: 'YouTube', src: `https://www.youtube-nocookie.com/embed/${youtube}` };
  }
  if (host === 'vimeo.com' || host === 'player.vimeo.com') {
    const vimeo = /\/(\d{5,12})(?:\/|$)/.exec(url.pathname)?.[1];
    if (vimeo) return { kind: 'embed', provider: 'Vimeo', src: `https://player.vimeo.com/video/${vimeo}?dnt=1` };
  }
  return { kind: 'link', href: url.toString() };
}

/** How many related projects a page shows. */
export const RELATED_SHOWN = 3;

/**
 * The related projects a page shows: the explicit picks, in order, that are
 * among `published` (so a draft or deleted project can never surface), never
 * the project itself, at most `RELATED_SHOWN`.
 */
export function pickRelated<P extends { id: string }>(selfId: string, ids: readonly string[], published: readonly P[]): P[] {
  const byId = new Map(published.map((p) => [p.id, p]));
  return [...new Set(ids)]
    .filter((id) => id !== selfId)
    .map((id) => byId.get(id))
    .filter((p): p is P => p !== undefined)
    .slice(0, RELATED_SHOWN);
}
