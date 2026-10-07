'use client';

import { useState, type KeyboardEvent, type ReactNode } from 'react';
import { Icon } from '@/components/ui/Icon';
import { SectionHead } from '@/components/ui/SectionHead';
import type { SectionContent } from '@/features/site/types';
import type { Dictionary } from '@/i18n/get-dictionary';

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
    { id: 'career', icon: 'briefcase', label: t.career, className: '' },
    { id: 'education', icon: 'cap', label: t.education, className: 'gold' },
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
      <SectionHead index="06" content={section} as="h1" id="experience-title">
        <div className="exp-toggle" role="tablist" style={{ marginTop: 4 }} onKeyDown={onKeyDown}>
          {tabs.map((x) => (
            <button
              key={x.id}
              id={`exp-tab-${x.id}`}
              type="button"
              role="tab"
              aria-selected={tab === x.id}
              aria-controls={`exp-panel-${x.id}`}
              tabIndex={tab === x.id ? 0 : -1}
              className={`${x.className} ${tab === x.id ? 'on' : ''}`}
              onClick={() => setTab(x.id)}
            >
              <Icon name={x.icon} /> {x.label}
            </button>
          ))}
        </div>
      </SectionHead>
      {tabs.map((x) => (
        <div key={x.id} id={`exp-panel-${x.id}`} role="tabpanel" aria-labelledby={`exp-tab-${x.id}`} hidden={tab !== x.id}>
          {panels[x.id]}
        </div>
      ))}
    </>
  );
}
