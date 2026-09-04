// Schema.org JSON-LD builders. Every value is read out of siteData.js /
// siteStrings.js so the graph can't drift from what the site actually renders.
//
// Pure functions only — no React, no DOM — because vite.config.js imports this
// at build time to inline the site-wide graph into index.html. Relative imports
// carry their .js extension for the same reason.
import { LOCALES } from './siteStrings.js';
import { idToPath } from './screens.js';
import {
  PERSON_ID, WEBSITE_ID, HEADSHOT_URL, OG_IMAGE_URL, absUrl, pageId,
} from './siteMeta.js';

const CONTEXT = 'https://schema.org';

// Deliberately coarse: the site says "Based In: Arizona, USA" and nothing
// narrower, so the graph says nothing narrower either.
const ADDRESS_REGION  = 'Arizona';
const ADDRESS_COUNTRY = 'US';

// Several career/education rows in siteData.js are still template stubs
// ("Placeholder Org", "Placeholder College"). Structured data must never
// assert one of those is a real organization.
const isPlaceholder = (name) => !name || /placeholder/i.test(name);

// Drops keys whose value is undefined or an empty array, so a field the site
// doesn't have yet is simply absent rather than emitted as null.
const compact = (obj) => Object.fromEntries(
  Object.entries(obj).filter(([, v]) => v !== undefined && !(Array.isArray(v) && !v.length))
);

// The one entry flagged `current: true`, unless it's a placeholder.
function currentOrg(entries, type) {
  const entry = entries?.find((e) => e.current);
  if (!entry || isPlaceholder(entry.org)) return undefined;
  return { '@type': type, name: entry.org };
}

// ---------------------------------------------------------------- entities

export function buildPerson(data) {
  const id = data.identity;
  return compact({
    '@type': 'Person',
    '@id': PERSON_ID,
    name: id.name,
    url: absUrl('/'),
    image: HEADSHOT_URL,
    jobTitle: id.title,
    description: id.statement,
    email: id.email,
    address: {
      '@type': 'PostalAddress',
      addressRegion: ADDRESS_REGION,
      addressCountry: ADDRESS_COUNTRY,
    },
    // Only the stack the site lists as current. `data.learning` is deliberately
    // left out — those are things being learned, not things known.
    knowsAbout: data.stack.flatMap((group) => group.skills),
    sameAs: [id.github, id.linkedin].filter(Boolean),
    worksFor: currentOrg(data.career, 'Organization'),
    // Not alumniOf: the site states the degree is still in progress.
    affiliation: currentOrg(data.education, 'EducationalOrganization'),
  });
}

export function buildWebSite(data) {
  return {
    '@type': 'WebSite',
    '@id': WEBSITE_ID,
    url: absUrl('/'),
    name: data.identity.name,
    alternateName: 'Alex Ball',
    description: data.identity.statement,
    // Both locales are served from the same URLs; there are no /es routes.
    inLanguage: LOCALES,
    creator: { '@id': PERSON_ID },
    author: { '@id': PERSON_ID },
    publisher: { '@id': PERSON_ID },
    // No SearchAction: the site has no search endpoint to point one at.
  };
}

// Route-independent half of the graph. Inlined into index.html at build time
// so crawlers that don't execute JavaScript still see it.
export const buildSiteGraph = (data) => ({
  '@context': CONTEXT,
  '@graph': [buildPerson(data), buildWebSite(data)],
});

// ------------------------------------------------------------- page nodes

// Only types that genuinely describe what each route renders. A screen absent
// from this map — the 404 included — gets no page node at all.
export const PAGE_TYPES = {
  home:       'WebPage',
  about:      'ProfilePage',
  projects:   'CollectionPage',
  experience: 'WebPage',
  resume:     'WebPage',
  contact:    'ContactPage',
};

// Shared by document.title and the JSON-LD page name so the two can't diverge.
export function pageTitle(screenId, data, strings) {
  return screenId === 'home'
    ? `${data.identity.name} — ${data.identity.title}`
    : `${strings.nav[screenId]} — ${data.identity.name}`;
}

// A single project. SoftwareSourceCode rather than SoftwareApplication: what
// the cards link to is a repository and a deployed page, not a distributable.
function buildProject(p) {
  return compact({
    '@type': 'SoftwareSourceCode',
    name: p.name,
    description: p.desc,
    url: p.links?.demo,
    codeRepository: p.links?.source,
    programmingLanguage: p.stack,
    author: { '@id': PERSON_ID },
  });
}

// Returns null while siteData's `projects` array is empty or entirely
// placeholders, which is the case today — the Projects screen renders generated
// placeholder cards. Nothing is emitted until real projects exist, and then it
// populates from the same array the cards render from.
export function buildProjectItemList(projects) {
  const real = (projects || []).filter((p) => p && !p.placeholder && p.name);
  if (!real.length) return null;
  return {
    '@type': 'ItemList',
    numberOfItems: real.length,
    itemListElement: real.map((p, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      item: buildProject(p),
    })),
  };
}

export function buildPageNode(screenId, data, strings, locale) {
  const type = PAGE_TYPES[screenId];
  if (!type) return null;

  const path = idToPath(screenId);
  const node = compact({
    '@context': CONTEXT,
    '@type': type,
    '@id': pageId(path),
    url: absUrl(path),
    name: pageTitle(screenId, data, strings),
    description: strings.pager?.descriptions?.[screenId],
    inLanguage: locale,
    isPartOf: { '@id': WEBSITE_ID },
  });

  // A ProfilePage's subject is the person; the other routes are merely about him.
  if (type === 'ProfilePage') node.mainEntity = { '@id': PERSON_ID };
  else node.about = { '@id': PERSON_ID };

  if (screenId === 'home') {
    node.primaryImageOfPage = {
      '@type': 'ImageObject',
      url: OG_IMAGE_URL,
      width: 1200,
      height: 630,
    };
  }

  if (screenId === 'projects') {
    const list = buildProjectItemList(data.projects);
    if (list) node.mainEntity = list;
  }

  return node;
}
