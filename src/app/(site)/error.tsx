'use client';

import { useEffect } from 'react';
import { Screen } from '@/components/layout/Screen';
import { buttonStyles } from '@/components/ui/button-styles';
import { SystemState } from '@/components/ui/SystemState';
import { copy } from '@/config/copy';

/** Route-level error boundary: keeps the site chrome and offers a retry. */
export default function RouteError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const t = copy.error;

  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <Screen>
      {/* A failed render must never be indexed in place of the page. */}
      <meta name="robots" content="noindex" />
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
