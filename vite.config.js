import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { DATA_ALL } from './src/data/siteData.js';
import { buildSiteGraph } from './src/data/structuredData.js';
import { jsonLdText } from './src/data/siteMeta.js';

// Evaluated once when the dev server starts or a build begins. On Vercel a
// production build only runs after a merge lands on master, so this is the
// date the live site was last deployed — not the visitor's clock.
const BUILD_TIME = new Date().toISOString();

// Inlines the route-independent half of the JSON-LD graph (Person + WebSite)
// into index.html. The app is client-rendered, so anything injected at runtime
// is invisible to crawlers that don't execute JavaScript; this block is not.
// Built from siteData.js rather than pasted into the HTML so it can't drift
// from the content the site actually renders. English is the default locale,
// and both locales share these URLs.
function structuredDataPlugin() {
  return {
    name: 'site-structured-data',
    transformIndexHtml: () => [{
      tag: 'script',
      attrs: { type: 'application/ld+json', id: 'ld-site' },
      children: jsonLdText(buildSiteGraph(DATA_ALL.en)),
      injectTo: 'head',
    }],
  };
}

export default defineConfig({
  plugins: [react(), structuredDataPlugin()],
  define: {
    __BUILD_TIME__: JSON.stringify(BUILD_TIME),
  },
});
