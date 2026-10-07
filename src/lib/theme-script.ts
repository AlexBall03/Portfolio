export type Theme = 'dark' | 'light';

/** localStorage key; kept from the previous site so returning visitors keep their choice. */
export const THEME_STORAGE_KEY = 'site-theme';

/**
 * Runs inline in <head> before first paint (no theme flash). Must be
 * self-contained: it is serialized into the page as a string.
 */
export function themeInitScript(defaultTheme: Theme): string {
  return `(function(){try{var t=localStorage.getItem(${JSON.stringify(THEME_STORAGE_KEY)});if(t!=='light'&&t!=='dark')t=${JSON.stringify(defaultTheme)};document.documentElement.setAttribute('data-theme',t)}catch(e){document.documentElement.setAttribute('data-theme',${JSON.stringify(defaultTheme)})}})()`;
}
