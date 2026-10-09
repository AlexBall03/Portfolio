import { absoluteMediaUrl, absoluteUrl, PERSON_ID, SHARE_CARD_SIZE, shareCardPath, SITE_LANG, WEBSITE_ID } from '@/config/site';
import type { Experience } from '@/features/experience/types';
import type { Profile, SocialLink } from '@/features/profile/types';
import type { Project } from '@/features/projects/types';
import type { SkillsOverview } from '@/features/skills/types';

/**
 * Schema.org JSON-LD builders. Pure functions over domain types, so the graph
 * always describes exactly what the site renders. Server-rendered into the
 * HTML, so crawlers that don't run JavaScript see it too.
 */
const CONTEXT = 'https://schema.org';

type Json = Record<string, unknown>;

/** Drops undefined values and empty arrays so absent facts are simply omitted. */
const compact = (obj: Json): Json =>
  Object.fromEntries(
    Object.entries(obj).filter(([, v]) => v !== undefined && v !== null && !(Array.isArray(v) && !v.length)),
  );

export interface SiteGraphInput {
  profile: Profile;
  socials: SocialLink[];
  experiences: Experience[];
  skills: SkillsOverview;
}

export function buildSiteGraph({ profile, socials, experiences, skills }: SiteGraphInput): Json {
  const job = experiences.find((e) => e.kind === 'career' && e.isCurrent);
  const school = experiences.find((e) => e.kind === 'education' && e.isCurrent);

  const person = compact({
    '@type': 'Person',
    '@id': PERSON_ID,
    name: profile.fullName,
    alternateName: profile.shortName,
    url: absoluteUrl('/'),
    // Uploaded headshots are absolute Blob URLs; only static ones are site paths.
    image: profile.headshot ? absoluteMediaUrl(profile.headshot.src) : undefined,
    jobTitle: profile.title,
    description: profile.statement,
    email: profile.email,
    address:
      profile.addressRegion || profile.addressCountry
        ? compact({
            '@type': 'PostalAddress',
            addressRegion: profile.addressRegion,
            addressCountry: profile.addressCountry,
          })
        : undefined,
    // Only the current stack — "learning" items are not claimed as known.
    knowsAbout: skills.stack.flatMap((c) => c.technologies.map((t) => t.name)),
    sameAs: socials.map((s) => s.url),
    worksFor: job ? { '@type': 'Organization', name: job.organization } : undefined,
    hasOccupation: job ? compact({ '@type': 'Occupation', name: job.role, skills: job.tags }) : undefined,
    // Not alumniOf: the degree is still in progress.
    affiliation: school ? { '@type': 'EducationalOrganization', name: school.organization } : undefined,
  });

  const website = {
    '@type': 'WebSite',
    '@id': WEBSITE_ID,
    url: absoluteUrl('/'),
    name: profile.fullName,
    alternateName: profile.shortName,
    description: profile.statement,
    inLanguage: SITE_LANG,
    creator: { '@id': PERSON_ID },
    author: { '@id': PERSON_ID },
    publisher: { '@id': PERSON_ID },
  };

  return { '@context': CONTEXT, '@graph': [person, website] };
}

export type PageType = 'WebPage' | 'ProfilePage' | 'CollectionPage' | 'ContactPage';

interface PageNodeInput {
  type: PageType;
  path: string;
  name: string;
  description?: string | null;
  projects?: Project[];
  primaryImage?: boolean;
}

export function buildPageNode({ type, path, name, description, projects, primaryImage }: PageNodeInput): Json {
  const url = absoluteUrl(path);
  return compact({
    '@context': CONTEXT,
    '@type': type,
    '@id': `${url}#webpage`,
    url,
    name,
    description,
    inLanguage: SITE_LANG,
    isPartOf: { '@id': WEBSITE_ID },
    ...(type === 'ProfilePage' ? { mainEntity: { '@id': PERSON_ID } } : { about: { '@id': PERSON_ID } }),
    primaryImageOfPage: primaryImage
      ? { '@type': 'ImageObject', url: absoluteUrl(shareCardPath(path)), ...SHARE_CARD_SIZE }
      : undefined,
    ...(projects?.length
      ? {
          mainEntity: {
            '@type': 'ItemList',
            numberOfItems: projects.length,
            itemListElement: projects.map((p, i) => ({
              '@type': 'ListItem',
              position: i + 1,
              item: buildProject(p),
            })),
          },
        }
      : {}),
  });
}

export function buildProject(p: Project): Json {
  const url = absoluteUrl(`/projects/${p.slug}`);
  const primary = p.repositories.find((r) => r.isPrimary) ?? p.repositories[0];
  return compact({
    '@type': 'SoftwareSourceCode',
    '@id': `${url}#project`,
    name: p.name,
    description: p.summary,
    url,
    inLanguage: SITE_LANG,
    image: p.cover ? absoluteMediaUrl(p.cover.src) : undefined,
    codeRepository: p.links.source ?? primary?.url,
    programmingLanguage: p.technologies.map((t) => t.name),
    author: { '@id': PERSON_ID },
  });
}

/**
 * Serializes for a <script type="application/ld+json"> body. Escaping "<"
 * stops a "</script>" inside any content string from closing the element.
 */
export const jsonLdText = (value: unknown) => JSON.stringify(value).replace(/</g, '\\u003c');
