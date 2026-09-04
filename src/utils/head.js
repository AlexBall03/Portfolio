// Head-tag writers for the client-rendered routes. The static tags in
// index.html are the defaults; these keep them in step with the active route.
import { jsonLdText } from '../data/siteMeta.js';

// index.html ships a canonical link; this repoints it at the current route so
// it stops claiming every page is the homepage.
export function setCanonical(url) {
  let tag = document.querySelector('link[rel="canonical"]');
  if (!tag) {
    tag = document.createElement('link');
    tag.setAttribute('rel', 'canonical');
    document.head.appendChild(tag);
  }
  tag.setAttribute('href', url);
}

// Updates an existing og:* tag in place. Absent tags are left alone, matching
// how the description meta is handled.
export function setMetaProperty(property, content) {
  document.querySelector(`meta[property="${property}"]`)?.setAttribute('content', content);
}

// Writes a JSON-LD block, or removes it when `value` is null. textContent is
// used rather than innerHTML, and jsonLdText has already escaped '<', so no
// content string can close the script element early.
export function setJsonLd(id, value) {
  const existing = document.getElementById(id);
  if (!value) { existing?.remove(); return; }
  let tag = existing;
  if (!tag) {
    tag = document.createElement('script');
    tag.type = 'application/ld+json';
    tag.id = id;
    document.head.appendChild(tag);
  }
  tag.textContent = jsonLdText(value);
}
