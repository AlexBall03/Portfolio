import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';

export type StatusTone = 'success' | 'brand' | 'accent' | 'neutral';

const TONES: Record<StatusTone, string> = {
  success: 'border-success/30 bg-success/10 text-success',
  brand: 'border-brand/30 bg-brand-soft text-brand-fg',
  accent: 'border-accent/35 bg-accent-soft text-accent-fg',
  neutral: 'border-line-strong bg-fg/[0.04] text-fg-muted',
};

interface StatusProps {
  tone?: StatusTone;
  /** Allow long (e.g. translated) labels to wrap; the pill becomes a soft rectangle. */
  wrap?: boolean;
  children: ReactNode;
  className?: string;
}

/** Compact state pill (availability, live, current). */
export function Status({ tone = 'neutral', wrap = false, children, className }: StatusProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-2 border px-2.5 py-1 font-mono text-micro uppercase',
        wrap ? 'max-w-full rounded-md' : 'rounded-full whitespace-nowrap',
        TONES[tone],
        className,
      )}
    >
      <span aria-hidden="true" className="size-1.5 shrink-0 rounded-full bg-current ring-3 ring-current/20" />
      {children}
    </span>
  );
}
