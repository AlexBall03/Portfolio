'use client';

import { type KeyboardEvent, type ReactNode, useId, useRef } from 'react';
import { DEFAULT_LOCALE, LOCALE_TAGS, type Locale } from '@/i18n/config';
import { cn } from '@/lib/cn';
import { EDITOR_LOCALES, type TranslationStatus } from '@/lib/cms/locale';

const STATUS_LABEL: Record<TranslationStatus, string> = {
  complete: 'Complete',
  partial: 'Incomplete',
  missing: 'Not translated',
};

const STATUS_TONE: Record<TranslationStatus, string> = {
  complete: 'text-success',
  partial: 'text-warning',
  missing: 'text-fg-faint',
};

interface LocaleTabsProps {
  active: Locale;
  onChange: (locale: Locale) => void;
  /** Overall status per locale (worst item wins in a list editor). */
  status: Record<Locale, TranslationStatus>;
  /** Server errors per locale, so a failed save points at the right tab. */
  errorCount: Record<Locale, number>;
  children: ReactNode;
}

/**
 * English | Español: one language at a time, with each tab's translation
 * status. The non-default tab explains the fallback rule once, above its
 * fields, so it doesn't need repeating per field.
 */
export function LocaleTabs({ active, onChange, status, errorCount, children }: LocaleTabsProps) {
  const id = useId();
  const tabs = useRef<Record<string, HTMLButtonElement | null>>({});

  const onKeyDown = (event: KeyboardEvent) => {
    const i = EDITOR_LOCALES.indexOf(active);
    const step = event.key === 'ArrowRight' ? 1 : event.key === 'ArrowLeft' ? -1 : 0;
    if (!step) return;
    event.preventDefault();
    const next = EDITOR_LOCALES[(i + step + EDITOR_LOCALES.length) % EDITOR_LOCALES.length]!;
    onChange(next);
    tabs.current[next]?.focus();
  };

  return (
    <div className="flex flex-col gap-5">
      <div role="tablist" aria-label="Content language" onKeyDown={onKeyDown} className="flex gap-1 border-b border-line">
        {EDITOR_LOCALES.map((locale) => {
          const selected = locale === active;
          const errors = errorCount[locale];
          return (
            <button
              key={locale}
              ref={(el) => {
                tabs.current[locale] = el;
              }}
              type="button"
              role="tab"
              id={`${id}-tab-${locale}`}
              aria-selected={selected}
              aria-controls={`${id}-panel`}
              tabIndex={selected ? 0 : -1}
              onClick={() => onChange(locale)}
              className={cn(
                '-mb-px flex items-center gap-2.5 border-b-2 px-3 py-2.5 text-body-sm transition-colors',
                selected ? 'border-brand font-medium text-fg' : 'border-transparent text-fg-muted hover:text-fg',
              )}
            >
              {LOCALE_TAGS[locale].label}
              {errors > 0 ? (
                <span className="rounded-full bg-danger/12 px-1.5 font-mono text-micro text-danger">
                  {errors} {errors === 1 ? 'error' : 'errors'}
                </span>
              ) : (
                <span className={cn('font-mono text-micro uppercase', STATUS_TONE[status[locale]])}>
                  {STATUS_LABEL[status[locale]]}
                </span>
              )}
            </button>
          );
        })}
      </div>
      <div role="tabpanel" id={`${id}-panel`} aria-labelledby={`${id}-tab-${active}`} className="flex flex-col gap-5">
        {active !== DEFAULT_LOCALE && (
          <p className="rounded-md border border-line bg-fg/[0.03] px-3.5 py-2.5 text-body-sm text-fg-muted">
            Blank {LOCALE_TAGS[active].label} fields show the English text (shown as placeholders) on the{' '}
            {LOCALE_TAGS[active].label} site. Once you start a translation, complete its required fields.
          </p>
        )}
        {children}
      </div>
    </div>
  );
}

/** A small per-item status pill for list editors. */
export function TranslationBadge({ locale, status }: { locale: Locale; status: TranslationStatus }) {
  if (locale === DEFAULT_LOCALE && status === 'complete') return null;
  return (
    <span className={cn('font-mono text-micro uppercase', STATUS_TONE[status])}>
      {locale.toUpperCase()} · {STATUS_LABEL[status]}
    </span>
  );
}
