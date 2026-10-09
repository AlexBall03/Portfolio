import type { ReactNode } from 'react';
import type { PageKey } from '@/features/site/types';
import { getNavPages } from './chrome-data';
import { Pager } from './Pager';
import { Screen } from './Screen';

/** Wraps a top-level page: content plus the previous/next pager. */
export async function PageShell({ page, children }: { page: PageKey; children: ReactNode }) {
  const pages = await getNavPages();
  return (
    <Screen>
      {/* The first band sits just under the command bar, not a full section gap below it. */}
      <div className="flex-1 [&>section:first-child]:pt-page-top">{children}</div>
      <Pager pages={pages} current={page} />
    </Screen>
  );
}
