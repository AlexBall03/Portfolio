import { createContext, useContext, useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { DATA_ALL } from '../data/siteData';
import { STR, LOCALES } from '../data/siteStrings';
import { SCREEN_IDS, idToPath } from '../data/screens';
import { absUrl } from '../data/siteMeta';
import { buildPageNode, pageTitle } from '../data/structuredData';
import { setCanonical, setMetaProperty, setJsonLd } from '../utils/head';

const AppContext = createContext(null);

const ACCENT = '#2D7FF9';
const GLOW   = 0.5;

// Returns null for a path that matches no screen, so the 404 route can be told
// apart from home — nav links stay unhighlighted and the head gets noindexed.
// Lowercased because React Router matches routes case-insensitively: /ABOUT
// renders the real About screen, so it must not be treated as a 404 here.
function pathToId(pathname) {
  const id = pathname.replace(/^\/+|\/+$/g, '').toLowerCase();
  if (!id) return 'home';
  return SCREEN_IDS.includes(id) ? id : null;
}

// Search engines shouldn't index a not-found route. 'follow' still lets them
// crawl the links back into the real site.
function setNoindex(on) {
  const existing = document.querySelector('meta[name="robots"]');
  if (!on) { existing?.remove(); return; }
  const tag = existing || document.head.appendChild(document.createElement('meta'));
  tag.setAttribute('name', 'robots');
  tag.setAttribute('content', 'noindex, follow');
}

export function AppProvider({ children }) {
  const [locale, setLocale] = useState(() => localStorage.getItem('site-locale') || 'en');
  const [theme,  setTheme]  = useState(() => localStorage.getItem('site-theme')  || 'dark');
  const location = useLocation();
  const screen = pathToId(location.pathname);
  const data = DATA_ALL[locale];
  const strings = STR[locale];

  useEffect(() => {
    document.documentElement.lang = locale;
    localStorage.setItem('site-locale', locale);
  }, [locale]);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('site-theme', theme);
  }, [theme]);

  useEffect(() => {
    document.documentElement.style.setProperty('--accent', ACCENT);
    document.documentElement.style.setProperty('--glow',   String(GLOW));
  }, []);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [location.pathname]);

  useEffect(() => {
    const notFound = screen === null;
    setNoindex(notFound);

    document.title = notFound
      ? `${strings.notFound.title} — ${data.identity.name}`
      : pageTitle(screen, data, strings);

    const description = notFound
      ? strings.notFound.description
      : strings.pager?.descriptions?.[screen];
    if (description) {
      document.querySelector('meta[name="description"]')?.setAttribute('content', description);
    }

    // A 404 has no canonical route of its own, so it keeps pointing at home —
    // it's already noindexed above. Every real route now canonicalises to
    // itself instead of inheriting the homepage URL from index.html.
    const url = absUrl(notFound ? '/' : idToPath(screen));
    setCanonical(url);
    setMetaProperty('og:url', url);

    // Person and WebSite live in the build-time #ld-site block; this is only
    // the page node, cross-referencing them by @id. Removed on a 404 so no
    // structured data ever claims an invalid URL is a real page.
    setJsonLd('ld-page', notFound ? null : buildPageNode(screen, data, strings, locale));
  }, [screen, data, strings, locale]);

  return (
    <AppContext.Provider value={{
      locale, setLocale,
      theme,  setTheme,
      screen,
      data, strings,
      LOCALES,
    }}>
      {children}
    </AppContext.Provider>
  );
}

export const useApp = () => useContext(AppContext);
