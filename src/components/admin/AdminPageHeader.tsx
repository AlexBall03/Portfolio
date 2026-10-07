import type { ReactNode } from 'react';
import { Eyebrow } from '@/components/ui/Eyebrow';

interface AdminPageHeaderProps {
  /** Section the page belongs to, e.g. "Content". */
  eyebrow: string;
  title: string;
  lead?: ReactNode;
  /** Primary page actions (right-aligned on wide screens). */
  actions?: ReactNode;
}

/** Page title block for console pages: denser than the public SectionHeader. */
export function AdminPageHeader({ eyebrow, title, lead, actions }: AdminPageHeaderProps) {
  return (
    <header className="flex flex-col gap-4 border-b border-line pb-6 sm:flex-row sm:items-end sm:justify-between">
      <div className="flex min-w-0 flex-col gap-3">
        <Eyebrow>{eyebrow}</Eyebrow>
        <h1 className="text-h2">{title}</h1>
        {lead && <p className="max-w-[60ch] text-body-sm text-fg-muted">{lead}</p>}
      </div>
      {actions && <div className="flex shrink-0 flex-wrap gap-2">{actions}</div>}
    </header>
  );
}
