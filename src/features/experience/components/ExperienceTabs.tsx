'use client';

import { useLayoutEffect, useRef, useState, type KeyboardEvent, type ReactNode } from 'react';
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

/**
 * Section heading with accessible Career/Education tabs over server-rendered
 * timelines. A single pill glides to the selected tab, and the incoming
 * timeline slides in from the direction of travel.
 */
export function ExperienceTabs({ section, t, panels }: ExperienceTabsProps) {
  const [tab, setTab] = useState<Tab>('career');
  // Unset until the first switch, so the initial render keeps the scroll reveal.
  const [dir, setDir] = useState<'next' | 'prev'>();
  const listRef = useRef<HTMLDivElement>(null);
  const pillRef = useRef<HTMLSpanElement>(null);
  const tabs = [
    { id: 'career', icon: 'briefcase', label: t.career, tint: 'text-brand-fg' },
    { id: 'education', icon: 'cap', label: t.education, tint: 'text-accent-fg' },
  ] as const;

  const select = (next: Tab) => {
    if (next === tab) return;
    setDir(next === 'education' ? 'next' : 'prev');
    setTab(next);
  };

  // Position the pill imperatively (no re-render). The first placement happens
  // before the pill is shown, so it never slides in from the edge.
  useLayoutEffect(() => {
    const list = listRef.current;
    const pill = pillRef.current;
    if (!list || !pill) return;
    const place = () => {
      const btn = list.querySelector<HTMLElement>(`#exp-tab-${tab}`);
      if (!btn) return;
      pill.style.width = `${btn.offsetWidth}px`;
      pill.style.transform = `translateX(${btn.offsetLeft}px)`;
      if (!list.hasAttribute('data-ready')) {
        void pill.offsetWidth; // commit the start position before transitions turn on
        list.setAttribute('data-ready', '');
      }
    };
    place();
    const ro = new ResizeObserver(place);
    ro.observe(list);
    return () => ro.disconnect();
  }, [tab]);

  const onKeyDown = (e: KeyboardEvent) => {
    if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
    e.preventDefault();
    const next: Tab = tab === 'career' ? 'education' : 'career';
    select(next);
    document.getElementById(`exp-tab-${next}`)?.focus();
  };

  return (
    <>
      <SectionHeader
        content={section}
        as="h1"
        id="experience-title"
        actions={
          <div
            ref={listRef}
            role="tablist"
            onKeyDown={onKeyDown}
            className="segmented relative inline-flex rounded-full border border-line bg-surface-inset/60 p-1"
          >
            <span ref={pillRef} aria-hidden="true" className="segmented-pill" />
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
                  onClick={() => select(x.id)}
                  className={cn(
                    'relative z-[1] inline-flex h-10 items-center gap-2 rounded-full px-4 text-body-sm font-medium transition-colors duration-300 [&_svg]:size-4 [&_svg]:transition-colors [&_svg]:duration-300',
                    on ? 'text-fg' : 'text-fg-muted hover:text-fg',
                  )}
                >
                  <Icon name={x.icon} className={on ? x.tint : undefined} /> {x.label}
                </button>
              );
            })}
          </div>
        }
      />
      <div className="tab-panels" data-dir={dir}>
        {tabs.map((x) => (
          <div key={x.id} id={`exp-panel-${x.id}`} role="tabpanel" aria-labelledby={`exp-tab-${x.id}`} hidden={tab !== x.id}>
            {panels[x.id]}
          </div>
        ))}
      </div>
    </>
  );
}
