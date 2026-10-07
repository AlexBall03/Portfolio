'use client';

import { Icon } from '@/components/ui/Icon';
import { LOCALES, LOCALE_TAGS, type Locale } from '@/i18n/config';
import type { Dictionary } from '@/i18n/get-dictionary';
import { cn } from '@/lib/cn';
import { useSwitchLocale } from '@/lib/client/locale';
import { useTheme } from '@/lib/client/theme';

type Toggles = Dictionary['toggles'];

/** Theme switch. Icon-only in the command bar; labelled in the drawer and footer. */
export function ThemeToggle({ t, labelled = false, className }: { t: Toggles; labelled?: boolean; className?: string }) {
  const [theme, setTheme] = useTheme();
  const current = theme === 'dark' ? t.dark : t.light;
  return (
    <button
      type="button"
      aria-label={`${t.theme}: ${current}`}
      onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
      className={cn(
        'inline-flex h-9 items-center justify-center gap-2 rounded-md text-fg-muted transition-colors hover:bg-fg/[0.06] hover:text-fg [&_svg]:size-4',
        labelled ? 'border border-line px-3 font-mono text-label uppercase' : 'w-9',
        className,
      )}
    >
      <Icon name={theme === 'dark' ? 'moon' : 'sun'} />
      {labelled && <span>{current}</span>}
    </button>
  );
}

/** EN/ES segmented control. */
export function LocaleSwitch({ locale, t, className }: { locale: Locale; t: Toggles; className?: string }) {
  const switchLocale = useSwitchLocale();
  return (
    <div role="group" aria-label={t.language} className={cn('inline-flex h-9 items-center rounded-md border border-line p-0.5', className)}>
      {LOCALES.map((l) => (
        <button
          key={l}
          type="button"
          lang={l}
          aria-pressed={locale === l}
          aria-label={LOCALE_TAGS[l].label}
          onClick={() => locale !== l && switchLocale(l)}
          className={cn(
            'h-full rounded-[calc(var(--radius-md)-3px)] px-2.5 font-mono text-micro uppercase transition-colors',
            locale === l ? 'bg-brand-soft text-fg' : 'text-fg-faint hover:text-fg',
          )}
        >
          {l}
        </button>
      ))}
    </div>
  );
}
