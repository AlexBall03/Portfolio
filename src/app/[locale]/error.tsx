'use client';

import { usePathname } from 'next/navigation';
import { useEffect } from 'react';
import { Screen } from '@/components/layout/Screen';
import { buttonStyles } from '@/components/ui/button-styles';
import { SystemState } from '@/components/ui/SystemState';
import { getDictionary } from '@/i18n/get-dictionary';
import { splitLocale } from '@/i18n/paths';

/** Route-level error boundary: keeps the site chrome and offers a retry. */
export default function RouteError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const t = getDictionary(splitLocale(usePathname()).locale).error;

  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <Screen>
      <SystemState
        code="500"
        title={t.title}
        lead={t.lead}
        actions={
          <button type="button" className={buttonStyles()} onClick={reset}>
            {t.retry}
          </button>
        }
      />
    </Screen>
  );
}
