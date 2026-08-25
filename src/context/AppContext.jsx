import { createContext, useContext, useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { DATA_ALL } from '../data/siteData';
import { STR, LOCALES } from '../data/siteStrings';
import { SCREEN_IDS } from '../data/screens';

const AppContext = createContext(null);

const ACCENT = '#2D7FF9';
const GLOW   = 0.5;

function pathToId(pathname) {
  const id = pathname.replace(/^\/+|\/+$/g, '');
  return id && SCREEN_IDS.includes(id) ? id : 'home';
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
    document.title = screen === 'home'
      ? `${data.identity.name} — ${data.identity.title}`
      : `${strings.nav[screen]} — ${data.identity.name}`;

    const description = strings.pager?.descriptions?.[screen];
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
