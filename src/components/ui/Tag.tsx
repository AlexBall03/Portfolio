import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';

const TAG = 'rounded-sm border border-line bg-fg/[0.03] px-2 py-1 font-mono text-micro text-fg-muted';

export function Tag({ children, className }: { children: ReactNode; className?: string }) {
  return <span className={cn(TAG, className)}>{children}</span>;
}

/** A list of restrained technology/metadata tags. */
export function TagList({ items, label, className }: { items: string[]; label?: string; className?: string }) {
  if (!items.length) return null;
  return (
    <ul aria-label={label} className={cn('flex flex-wrap gap-1.5', className)}>
      {items.map((item) => (
        <li key={item} className={TAG}>
          {item}
        </li>
      ))}
    </ul>
  );
}
