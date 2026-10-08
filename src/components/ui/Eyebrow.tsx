import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';

interface EyebrowProps {
  index?: string;
  /** `center` mirrors the rule on both sides so a centered label stays balanced. */
  align?: 'start' | 'center';
  children: ReactNode;
  className?: string;
}

const rule = 'h-px w-7 shrink-0 from-accent/70 to-transparent';

/** Mono section label with an optional brass index: `04 —— SELECTED WORK`, or `—— ADMIN ——` centered. */
export function Eyebrow({ index, align = 'start', children, className }: EyebrowProps) {
  return (
    <p className={cn('flex items-center gap-3 font-mono text-label tracking-[0.18em] text-fg-muted uppercase', className)}>
      {index && <span className="text-accent-fg">{index}</span>}
      <span aria-hidden="true" className={cn(rule, 'bg-gradient-to-r')} />
      <span className="min-w-0">{children}</span>
      {align === 'center' && <span aria-hidden="true" className={cn(rule, 'bg-gradient-to-l')} />}
    </p>
  );
}
