import type { ReactNode } from 'react';
import type { SectionContent } from '@/features/site/types';
import { cn } from '@/lib/cn';
import { Eyebrow } from './Eyebrow';
import { Reveal } from './Reveal';

interface SectionHeaderProps {
  /** Two-digit section index shown in the eyebrow, e.g. "04". */
  index?: string;
  content: SectionContent;
  /** Heading level; the first section of a page is its h1. */
  as?: 'h1' | 'h2';
  id?: string;
  /** Controls placed beside the heading on wide screens (tabs, links). */
  actions?: ReactNode;
  className?: string;
}

export function SectionHeader({ index, content, as: Heading = 'h2', id, actions, className }: SectionHeaderProps) {
  return (
    <Reveal className={cn('mb-12 flex flex-col gap-8 md:mb-16 lg:flex-row lg:items-end lg:justify-between', className)}>
      <div className="flex max-w-3xl flex-col gap-5">
        <Eyebrow index={index}>{content.eyebrow}</Eyebrow>
        <Heading id={id} className="text-h1">
          {content.title}
        </Heading>
        {content.subtitle && <p className="max-w-2xl text-body-lg text-fg-muted">{content.subtitle}</p>}
      </div>
      {actions && <div className="shrink-0">{actions}</div>}
    </Reveal>
  );
}
