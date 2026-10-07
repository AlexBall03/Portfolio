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
      <div className="flex-1">{children}</div>
      <Pager pages={pages} current={page} t={getDictionary(locale).pager} />
    </Screen>
  );
}
