'use client';

import Link from 'next/link';
import { pageForPath } from '@/config/navigation';
import { useLocalelessPath } from '@/lib/client/locale';
import type { NavPage } from './types';

export function FooterNav({ pages, label }: { pages: NavPage[]; label: string }) {
  const current = pageForPath(useLocalelessPath());
  return (
    <nav className="f-col f-col-nav" aria-label={label}>
      <span className="f-col-title mono">{label}</span>
      {pages.map((p) => (
        <Link
          key={p.key}
          href={p.href}
          className={current === p.key ? 'active' : ''}
          aria-current={current === p.key ? 'page' : undefined}
        >
          {p.label}
        </Link>
      ))}
    </nav>
  );
}
