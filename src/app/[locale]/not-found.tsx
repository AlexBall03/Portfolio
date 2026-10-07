'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Screen } from '@/components/layout/Screen';
import { buttonStyles } from '@/components/ui/button-styles';
import { Icon } from '@/components/ui/Icon';
import { SystemState } from '@/components/ui/SystemState';
import { getDictionary } from '@/i18n/get-dictionary';
import { localizedPath, splitLocale } from '@/i18n/paths';

/**
 * Localized 404. Not-found boundaries don't receive route params, so the
 * locale is read from the URL. Search engines get a 404 status and noindex.
 */
export default function NotFound() {
  const { locale } = splitLocale(usePathname());
  const t = getDictionary(locale).notFound;

  return (
    <Screen>
      <title>{t.title}</title>
      <meta name="robots" content="noindex, follow" />
      <SystemState
        code={t.code}
        title={t.heading}
        lead={t.lead}
        actions={
          <>
            <Link href={localizedPath(locale, '/')} className={buttonStyles()}>
              {t.home} <Icon name="arrowRight" />
            </Link>
            <Link href={localizedPath(locale, '/projects')} className={buttonStyles({ variant: 'secondary' })}>
              {t.projects}
            </Link>
          </>
        }
      />
    </Screen>
  );
}
