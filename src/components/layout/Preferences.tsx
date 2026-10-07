'use client';

import { Icon } from '@/components/ui/Icon';
import { LOCALES, LOCALE_TAGS, type Locale } from '@/i18n/config';
import type { Dictionary } from '@/i18n/get-dictionary';
import { useSwitchLocale } from '@/lib/client/locale';
import { useTheme } from '@/lib/client/theme';

/** Theme and language toggles. */
export function Preferences({ locale, t }: { locale: Locale; t: Dictionary['toggles'] }) {
  const [theme, setTheme] = useTheme();
  const switchLocale = useSwitchLocale();

  return (
    <div className="f-prefs">
      <button
        type="button"
        className="pref-toggle"
        aria-label={`${t.theme}: ${theme === 'dark' ? t.dark : t.light}`}
        onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
      >
        <Icon name={theme === 'dark' ? 'moon' : 'sun'} />
        <span>{theme === 'dark' ? t.dark : t.light}</span>
      </button>
      <div className="lang-toggle" role="group" aria-label={t.language}>
        {LOCALES.map((l) => (
          <button
            key={l}
            type="button"
            lang={l}
            className={locale === l ? 'on' : ''}
            aria-pressed={locale === l}
            aria-label={LOCALE_TAGS[l].label}
            onClick={() => locale !== l && switchLocale(l)}
          >
            {l.toUpperCase()}
          </button>
        ))}
      </div>
    </div>
  );
}
