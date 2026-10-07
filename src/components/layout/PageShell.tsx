import type { ReactNode } from 'react';
import type { PageKey } from '@/features/site/types';
import type { Locale } from '@/i18n/config';
import { getDictionary } from '@/i18n/get-dictionary';
import { getNavPages } from './chrome-data';
import { Pager } from './Pager';

/** Wraps a top-level page: content plus the previous/next pager. */
export async function PageShell({ page, locale, children }: { page: PageKey; locale: Locale; children: ReactNode }) {
  const pages = await getNavPages(locale);
  return (
    <div className="screen">
      <div className="screen-body">{children}</div>
      <Pager pages={pages} current={page} t={getDictionary(locale).pager} />
    </div>
  );
}
