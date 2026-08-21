import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { DATA_ALL } from '../data/siteData';
import { STR, LOCALES } from '../data/siteStrings';

const AppContext = createContext(null);

const ACCENT = '#2D7FF9';
const GLOW   = 0.5;

export function AppProvider({ children }) {
  const [locale, setLocale] = useState(() => localStorage.getItem('site-locale') || 'en');
  const [theme,  setTheme]  = useState(() => localStorage.getItem('site-theme')  || 'dark');
  const [screen, setScreen] = useState('home');

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

  const goToScreen = useCallback((id) => {
    setScreen(id);
    window.scrollTo(0, 0);
  }, []);

  return (
    <AppContext.Provider value={{
      locale, setLocale,
      theme,  setTheme,
      screen, goToScreen,
      data:    DATA_ALL[locale],
      strings: STR[locale],
      LOCALES,
    }}>
      {children}
    </AppContext.Provider>
  );
}

export const useApp = () => useContext(AppContext);
