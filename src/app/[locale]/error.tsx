'use client';

import { usePathname } from 'next/navigation';
import { useEffect } from 'react';
import { getDictionary } from '@/i18n/get-dictionary';
import { splitLocale } from '@/i18n/paths';

/** Route-level error boundary: keeps the site chrome and offers a retry. */
export default function RouteError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const t = getDictionary(splitLocale(usePathname()).locale).error;

  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <section className="band nf">
      <div className="wrap nf-inner">
        <h1 className="h-section">{t.title}</h1>
        <p className="lead nf-lead">{t.lead}</p>
        <div className="nf-cta">
          <button type="button" className="btn btn-primary" onClick={reset}>
            {t.retry}
          </button>
        </div>
      </div>
    </section>
  );
}
