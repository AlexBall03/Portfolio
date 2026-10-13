import type { ReactNode } from 'react';
import type { PageKey } from '@/features/site/types';
import { cn } from '@/lib/cn';
import { getNavPages } from './chrome-data';
import { Pager } from './Pager';
import { Screen } from './Screen';

/** Wraps a top-level page: content plus the previous/next pager. */
export async function PageShell({ page, children }: { page: PageKey; children: ReactNode }) {
  const pages = await getNavPages();
  // A page outside the navigation has no pager, so it needs its own space above the footer.
  const paged = pages.some((p) => p.key === page);
  return (
    <Screen>
      {/* The first band sits just under the command bar, not a full section gap below it. */}
      <div className={cn('flex-1 [&>section:first-child]:pt-page-top', !paged && 'pb-section')}>{children}</div>
      <Pager pages={pages} current={page} />
    </Screen>
  );
}
