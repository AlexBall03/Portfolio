import type { ReactNode } from 'react';
import type { SectionContent } from '@/features/site/types';
import { Reveal } from './Reveal';

interface SectionHeadProps {
  /** Two-digit section index shown in the eyebrow, e.g. "04". */
  index?: string;
  content: SectionContent;
  /** Heading level; the first section of a page is its h1. */
  as?: 'h1' | 'h2';
  id?: string;
  children?: ReactNode;
}

export function SectionHead({ index, content, as: Heading = 'h2', id, children }: SectionHeadProps) {
  return (
    <Reveal className="section-head">
      <div className="eyebrow">
        {index && <span className="idx">{index}</span>}
        <span className="bar" />
        <span>{content.eyebrow}</span>
      </div>
      <Heading className="h-section" id={id}>
        {content.title}
      </Heading>
      {content.subtitle && <p className="sub">{content.subtitle}</p>}
      {children}
    </Reveal>
  );
}
