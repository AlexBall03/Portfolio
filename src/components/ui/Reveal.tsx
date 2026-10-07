'use client';

import type { CSSProperties, ReactNode } from 'react';
import { cn } from '@/lib/cn';
import { useInView } from '@/lib/client/in-view';

interface RevealProps {
  children?: ReactNode;
  /** Entrance delay in ms (staggering). */
  delay?: number;
  className?: string;
}

/**
 * Scroll-reveal wrapper. Server-rendered visible; once JavaScript runs, the
 * content fades in as it enters the viewport. Children stay Server Components.
 * Under reduced motion the CSS disables the effect entirely.
 */
export function Reveal({ children, delay = 0, className }: RevealProps) {
  const [ref, inView] = useInView<HTMLDivElement>();
  return (
    <div
      ref={ref}
      className={cn('reveal', className)}
      // The delay is a runtime value, so it travels as a custom property.
      style={delay ? ({ '--d': `${delay}ms` } as CSSProperties) : undefined}
      data-revealed={inView ? '' : undefined}
    >
      {children}
    </div>
  );
}
