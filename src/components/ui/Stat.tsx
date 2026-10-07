import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';
import { CountUp } from './CountUp';

interface StatProps {
  value: number;
  suffix?: string;
  label: string;
  note?: string | null;
  /** Optional leading glyph (e.g. an Icon). */
  icon?: ReactNode;
  tone?: 'brand' | 'accent';
  className?: string;
}

/**
 * Hairline dividers for a stat grid that is 2 columns on small screens and
 * one row on large ones — rules between stats instead of a box per stat.
 */
export function statDividers(i: number): string {
  return cn('border-line', i % 2 === 1 && 'border-l', i >= 2 && 'border-t lg:border-t-0', i > 0 && 'lg:border-l');
}

/**
 * A metric as a dt/dd pair (place inside a <dl>). The label precedes the value
 * in the DOM so it reads "Degree progress, 60%", and is displayed beneath it.
 */
export function Stat({ value, suffix, label, note, icon, tone = 'brand', className }: StatProps) {
  const toneText = tone === 'accent' ? 'text-accent-fg' : 'text-brand-fg';
  return (
    <div className={cn('flex flex-col-reverse justify-end gap-3', className)}>
      <dt className="flex flex-col gap-1">
        <span className="text-body-sm font-medium text-fg">{label}</span>
        {note && <span className="font-mono text-micro text-fg-faint">{note}</span>}
      </dt>
      <dd className="flex items-center gap-3">
        {icon && <span className={cn('[&_svg]:size-4', toneText)}>{icon}</span>}
        <CountUp
          value={value}
          suffix={suffix}
          className="font-display text-h1 font-semibold text-fg tabular-nums"
          suffixClassName={cn('ml-0.5 text-[0.55em]', toneText)}
        />
      </dd>
    </div>
  );
}
