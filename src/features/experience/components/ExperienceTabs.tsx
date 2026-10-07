'use client';

import { useState, type KeyboardEvent, type ReactNode } from 'react';
import { Icon } from '@/components/ui/Icon';
import { SectionHeader } from '@/components/ui/SectionHeader';
import type { SectionContent } from '@/features/site/types';
import type { Dictionary } from '@/i18n/get-dictionary';
import { cn } from '@/lib/cn';

type Tab = 'career' | 'education';

interface ExperienceTabsProps {
  section: SectionContent;
  t: Dictionary['experience'];
  /** Server-rendered timelines; only the active one is shown. */
  panels: Record<Tab, ReactNode>;
}

/** Section heading with accessible Career/Education tabs over server-rendered timelines. */
export function ExperienceTabs({ section, t, panels }: ExperienceTabsProps) {
  const [tab, setTab] = useState<Tab>('career');
  const tabs = [
    { id: 'career', icon: 'briefcase', label: t.career, tint: 'text-brand-fg' },
    { id: 'education', icon: 'cap', label: t.education, tint: 'text-accent-fg' },
  ] as const;

  const onKeyDown = (e: KeyboardEvent) => {
    if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
    e.preventDefault();
    const next: Tab = tab === 'career' ? 'education' : 'career';
    setTab(next);
    document.getElementById(`exp-tab-${next}`)?.focus();
  };

  return (
    <>
      <SectionHeader
        index="06"
        content={section}
        as="h1"
        id="experience-title"
        actions={
          <div role="tablist" onKeyDown={onKeyDown} className="inline-flex rounded-full border border-line bg-surface-inset/60 p-1">
            {tabs.map((x) => {
              const on = tab === x.id;
              return (
                <button
                  key={x.id}
                  id={`exp-tab-${x.id}`}
                  type="button"
                  role="tab"
                  aria-selected={on}
                  aria-controls={`exp-panel-${x.id}`}
                  tabIndex={on ? 0 : -1}
                  onClick={() => setTab(x.id)}
                  className={cn(
                    'inline-flex h-10 items-center gap-2 rounded-full px-4 text-body-sm font-medium transition-colors [&_svg]:size-4',
                    on ? 'bg-surface-raised text-fg shadow-sm ring-1 ring-line-strong' : 'text-fg-muted hover:text-fg',
                  )}
                >
                  <Icon name={x.icon} className={on ? x.tint : undefined} /> {x.label}
                </button>
              );
            })}
          </div>
        }
      />
      {tabs.map((x) => (
        <div key={x.id} id={`exp-panel-${x.id}`} role="tabpanel" aria-labelledby={`exp-tab-${x.id}`} hidden={tab !== x.id}>
          {panels[x.id]}
        </div>
      ))}
    </>
  );
}
