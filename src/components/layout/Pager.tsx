import Link from 'next/link';
import type { ReactNode } from 'react';
import { Container } from '@/components/ui/Container';
import { Icon } from '@/components/ui/Icon';
import { copy } from '@/config/copy';
import type { PageKey } from '@/features/site/types';
import { cn } from '@/lib/cn';
import type { NavPage } from './types';

const pad = (n: number) => String(n + 1).padStart(2, '0');

interface PagerLinkProps {
  dir: 'prev' | 'next';
  href: string;
  /** Mono kicker, e.g. "Next · 03". */
  kicker: string;
  title: string;
  description?: string | null;
}

/** One side of a previous/next pair. Text-led: the title carries the link. */
export function PagerLink({ dir, href, kicker, title, description }: PagerLinkProps) {
  const next = dir === 'next';
  return (
    <Link
      href={href}
      className={cn(
        'group flex min-w-0 flex-col gap-2 rounded-md py-6 focus-visible:outline-offset-8',
        next && 'sm:col-start-2 sm:items-end sm:text-right',
      )}
    >
      <span className="font-mono text-label tracking-[0.14em] text-fg-faint uppercase">{kicker}</span>
      <span
        className={cn(
          'flex items-center gap-3 font-display text-h2 font-semibold text-fg transition-colors group-hover:text-brand-fg',
          !next && 'flex-row-reverse justify-end',
        )}
      >
        <span className="min-w-0 break-words">{title}</span>
        <Icon
          name={next ? 'arrowRight' : 'arrowLeft'}
          className={cn(
            'size-5 shrink-0 text-brand-fg transition-transform duration-200',
            next ? 'group-hover:translate-x-1' : 'group-hover:-translate-x-1',
          )}
        />
      </span>
      {description && <span className="line-clamp-2 max-w-[44ch] text-body-sm text-fg-muted">{description}</span>}
    </Link>
  );
}

/** A hairline-topped pair of previous/next links. */
export function PagerNav({ label, children }: { label: string; children: ReactNode }) {
  return (
    <nav aria-label={label} className="mt-section pb-12">
      <Container>
        <div className="grid gap-x-12 border-t border-line sm:grid-cols-2">{children}</div>
      </Container>
    </nav>
  );
}

/** Previous/next page links at the bottom of every top-level page. */
export function Pager({ pages, current }: { pages: NavPage[]; current: PageKey }) {
  const t = copy.pager;
  const index = pages.findIndex((p) => p.key === current);
  if (index === -1) return null;
  const prev = pages[index - 1];
  const next = pages[index + 1];

  return (
    <PagerNav label={`${t.previous} / ${t.next}`}>
      {prev && (
        <PagerLink dir="prev" href={prev.href} kicker={`${t.previous} · ${pad(index - 1)}`} title={prev.label} description={prev.description} />
      )}
      {next && (
        <PagerLink dir="next" href={next.href} kicker={`${t.next} · ${pad(index + 1)}`} title={next.label} description={next.description} />
      )}
    </PagerNav>
  );
}
