import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';
import { Container } from './Container';

interface SectionProps {
  id?: string;
  labelledBy?: string;
  children: ReactNode;
  className?: string;
  containerClassName?: string;
}

/** A page band: the shared vertical rhythm around a Container. */
export function Section({ id, labelledBy, children, className, containerClassName }: SectionProps) {
  return (
    <section id={id} aria-labelledby={labelledBy} className={cn('relative pt-section', className)}>
      <Container className={containerClassName}>{children}</Container>
    </section>
  );
}
