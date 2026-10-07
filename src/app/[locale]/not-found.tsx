'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Icon } from '@/components/ui/Icon';
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
    <div className="screen">
      <title>{t.title}</title>
      <meta name="robots" content="noindex, follow" />
      <section className="band nf">
        <div className="wrap nf-inner">
          <div className="nf-code mono">{t.code}</div>
          <h1 className="h-section">{t.heading}</h1>
          <p className="lead nf-lead">{t.lead}</p>
          <div className="nf-cta">
            <Link href={localizedPath(locale, '/')} className="btn btn-primary">
              {t.home} <Icon name="arrowRight" />
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
