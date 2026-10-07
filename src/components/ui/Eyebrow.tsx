import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';

/** Mono section label with an optional brass index: `04 —— SELECTED WORK`. */
export function Eyebrow({ index, children, className }: { index?: string; children: ReactNode; className?: string }) {
  return (
    <p className={cn('flex items-center gap-3 font-mono text-label tracking-[0.18em] text-fg-muted uppercase', className)}>
      {index && <span className="text-accent-fg">{index}</span>}
      <span aria-hidden="true" className="h-px w-7 shrink-0 bg-gradient-to-r from-accent/70 to-transparent" />
      <span className="min-w-0">{children}</span>
    </p>
  );
}
