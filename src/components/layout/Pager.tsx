import Link from 'next/link';
import { Icon } from '@/components/ui/Icon';
import type { PageKey } from '@/features/site/types';
import type { Dictionary } from '@/i18n/get-dictionary';
import type { NavPage } from './types';

const pad = (n: number) => String(n + 1).padStart(2, '0');

interface PanelProps {
  dir: 'prev' | 'next';
  from: number;
  to: number;
  page: NavPage;
  label: string;
}

function Panel({ dir, from, to, page, label }: PanelProps) {
  return (
    <Link href={page.href} className={`pager-panel pager-panel--${dir}`}>
      <div className="pager-panel-body">
        <span className="pager-tag mono">{label}</span>
        <span className="pager-idx mono">
          {pad(from)} → {pad(to)}
        </span>
        <span className="pager-title">{page.label}</span>
        {page.description && <span className="pager-desc">{page.description}</span>}
      </div>
      <Icon name="arrowRight" className="pager-arrow" />
    </Link>
  );
}

/** Previous/next page panels at the bottom of every top-level page. */
export function Pager({ pages, current, t }: { pages: NavPage[]; current: PageKey; t: Dictionary['pager'] }) {
  const index = pages.findIndex((p) => p.key === current);
  if (index === -1) return null;
  const prev = pages[index - 1];
  const next = pages[index + 1];

  return (
    <nav className="band pager-band" aria-label={`${t.previous} / ${t.next}`}>
      <div className={`wrap pager-grid ${!prev || !next ? 'pager-single' : ''}`}>
        {prev && <Panel dir="prev" from={index} to={index - 1} page={prev} label={t.previous.toUpperCase()} />}
        {next && <Panel dir="next" from={index} to={index + 1} page={next} label={t.next.toUpperCase()} />}
      </div>
    </nav>
  );
}
