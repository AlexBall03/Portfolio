import type { ReactNode } from 'react';
import type { PageKey } from '@/features/site/types';
import type { Locale } from '@/i18n/config';
import { getDictionary } from '@/i18n/get-dictionary';
import { getNavPages } from './chrome-data';
import { Pager } from './Pager';
import { Screen } from './Screen';

/** Wraps a top-level page: content plus the previous/next pager. */
export async function PageShell({ page, locale, children }: { page: PageKey; locale: Locale; children: ReactNode }) {
  const pages = await getNavPages(locale);
  return (
    <Screen>
      {/* The first band sits just under the command bar, not a full section gap below it. */}
      <div className="flex-1 [&>section:first-child]:pt-page-top">{children}</div>
      <Pager pages={pages} current={page} t={getDictionary(locale).pager} />
    </Screen>
  );
}
