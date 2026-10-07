'use client';

import { Icon } from '@/components/ui/Icon';
import { LOCALES, LOCALE_TAGS, type Locale } from '@/i18n/config';
import type { Dictionary } from '@/i18n/get-dictionary';
import { cn } from '@/lib/cn';
import { useSwitchLocale } from '@/lib/client/locale';
import { useTheme } from '@/lib/client/theme';

type Toggles = Dictionary['toggles'];

/** Shared shell of the bordered utility controls (search, theme, language). */
export const controlStyles =
  'inline-flex h-9 items-center rounded-md border border-line text-fg-muted transition-colors hover:border-line-strong hover:text-fg';

/** Icon-only theme toggle for the command bar; the drawer and footer use ThemeSwitch. */
export function ThemeToggle({ t, className }: { t: Toggles; className?: string }) {
  const [theme, setTheme] = useTheme();
  const current = theme === 'dark' ? t.dark : t.light;
  return (
    <button
      type="button"
      aria-label={`${t.theme}: ${current}`}
      onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
      className={cn(controlStyles, 'w-9 justify-center hover:bg-fg/[0.06] [&_svg]:size-4', className)}
    >
      <Icon name={theme === 'dark' ? 'moon' : 'sun'} />
    </button>
  );
}

/** One option of a segmented control (theme, language): equal-width, inner pill when selected. */
const segment = (selected: boolean) =>
  cn(
    'inline-flex h-full min-w-9 items-center justify-center rounded-[calc(var(--radius-md)-3px)] px-2 font-mono text-micro uppercase transition-colors [&_svg]:size-4',
    selected ? 'bg-brand-soft text-fg' : 'text-fg-faint hover:text-fg',
  );

/** Dark/light segmented control, the twin of LocaleSwitch. */
export function ThemeSwitch({ t, className }: { t: Toggles; className?: string }) {
  const [theme, setTheme] = useTheme();
  const options = [
    { value: 'dark', label: t.dark, icon: 'moon' },
    { value: 'light', label: t.light, icon: 'sun' },
  ] as const;
  return (
    <div role="group" aria-label={t.theme} className={cn(controlStyles, 'p-0.5', className)}>
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          aria-pressed={theme === o.value}
          aria-label={o.label}
          title={o.label}
          onClick={() => setTheme(o.value)}
          className={segment(theme === o.value)}
        >
          <Icon name={o.icon} />
        </button>
      ))}
    </div>
  );
}

/** EN/ES segmented control. */
export function LocaleSwitch({ locale, t, className }: { locale: Locale; t: Toggles; className?: string }) {
  const switchLocale = useSwitchLocale();
  return (
    <div role="group" aria-label={t.language} className={cn(controlStyles, 'p-0.5', className)}>
      {LOCALES.map((l) => (
        <button
          key={l}
          type="button"
          lang={l}
          aria-pressed={locale === l}
          aria-label={LOCALE_TAGS[l].label}
          onClick={() => locale !== l && switchLocale(l)}
          className={segment(locale === l)}
        >
          {l}
        </button>
      ))}
    </div>
  );
}
