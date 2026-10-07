'use client';

import Link from 'next/link';
import { pageForPath } from '@/config/navigation';
import { cn } from '@/lib/cn';
import { useLocalelessPath } from '@/lib/client/locale';
import type { NavPage } from './types';

export function FooterNav({ pages, label, titleClassName }: { pages: NavPage[]; label: string; titleClassName: string }) {
  const current = pageForPath(useLocalelessPath());
  return (
    <nav aria-label={label} className="flex flex-col gap-4">
      <span className={titleClassName}>{label}</span>
      <ul className="flex flex-col gap-2.5">
        {pages.map((p) => (
          <li key={p.key}>
            <Link
              href={p.href}
              aria-current={current === p.key ? 'page' : undefined}
              className={cn(
                'text-body-sm transition-colors hover:text-fg',
                current === p.key ? 'text-fg' : 'text-fg-muted',
              )}
            >
              {p.label}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
