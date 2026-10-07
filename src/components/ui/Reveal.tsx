'use client';

import type { CSSProperties, ReactNode } from 'react';
import { useInView } from '@/lib/client/in-view';

interface RevealProps {
  children?: ReactNode;
  /** Entrance delay in ms (staggering). */
  delay?: number;
  className?: string;
  style?: CSSProperties;
  id?: string;
}

/**
 * Scroll-reveal wrapper. Server-rendered visible; once JavaScript runs, the
 * content fades in as it enters the viewport. Children stay Server Components.
 * Under reduced motion the CSS disables the effect entirely.
 */
export function Reveal({ children, delay = 0, className = '', style, id }: RevealProps) {
  const [ref, inView] = useInView<HTMLDivElement>();
  return (
    <div
      ref={ref}
      id={id}
      className={`reveal ${className}`}
      style={{ '--d': `${delay}ms`, ...style } as CSSProperties}
      data-revealed={inView ? '' : undefined}
    >
      {children}
    </div>
  );
}
