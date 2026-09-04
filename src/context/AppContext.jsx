import { createContext, useContext, useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { DATA_ALL } from '../data/siteData';
import { STR, LOCALES } from '../data/siteStrings';
import { SCREEN_IDS } from '../data/screens';

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

    if (notFound) {
      document.title = `${strings.notFound.title} — ${data.identity.name}`;
    } else if (screen === 'home') {
      document.title = `${data.identity.name} — ${data.identity.title}`;
    } else {
      document.title = `${strings.nav[screen]} — ${data.identity.name}`;
    }

    const description = notFound
      ? strings.notFound.description
      : strings.pager?.descriptions?.[screen];
    if (description) {
      document.querySelector('meta[name="description"]')?.setAttribute('content', description);
    }
  }, [screen, data, strings]);

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
