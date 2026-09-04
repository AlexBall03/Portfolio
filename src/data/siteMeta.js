// Production URL facts for the site, plus the stable @id values the JSON-LD
// graph is stitched together with. Kept free of React and DOM access so
// vite.config.js can import it at build time.

export const SITE_URL = 'https://alexball.dev';

// Fragment @ids let every page node point at one canonical Person/WebSite
// instead of restating them. They are identifiers, not fetchable URLs.
export const PERSON_ID  = `${SITE_URL}/#person`;
export const WEBSITE_ID = `${SITE_URL}/#website`;

export const HEADSHOT_URL = `${SITE_URL}/assets/headshot.png`;
export const OG_IMAGE_URL = `${SITE_URL}/assets/og-image.png`;

// Absolute URL for a router path. The root keeps its trailing slash and the
// rest have none, matching index.html's canonical and public/sitemap.xml —
// a mismatch here would hand crawlers two spellings of the same page.
export function absUrl(path = '/') {
  const trimmed = String(path).replace(/^\/+|\/+$/g, '');
  return trimmed ? `${SITE_URL}/${trimmed}` : `${SITE_URL}/`;
}

export const pageId = (path) => `${absUrl(path)}#webpage`;

// Serializes a value for a <script type="application/ld+json"> body. Escaping
// '<' is what stops a stray "</script>" inside any content string from closing
// the element early and turning the rest of the payload into markup. Both the
// build-time and runtime writers go through this, so there is one rule.
export const jsonLdText = (value) =>
  JSON.stringify(value).replace(/</g, '\\u003c');
