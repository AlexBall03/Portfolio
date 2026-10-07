import { Reveal } from '@/components/ui/Reveal';
import { Section } from '@/components/ui/Section';
import { Status } from '@/components/ui/Status';
import { Tag, TagList } from '@/components/ui/Tag';
import type { SectionContent } from '@/features/site/types';
import type { Locale } from '@/i18n/config';
import type { Dictionary } from '@/i18n/get-dictionary';
import { cn } from '@/lib/cn';
import { formatExperienceRange } from '../format';
import type { Experience as ExperienceItem } from '../types';
import { ExperienceTabs } from './ExperienceTabs';

interface ExperienceProps {
  section: SectionContent;
  items: ExperienceItem[];
  locale: Locale;
  t: Dictionary['experience'];
}

/**
 * A résumé-style timeline: dates in their own column, a rail, then the role.
 * Typography carries the hierarchy; only the current role gets a glass panel.
 */
function Timeline({ items, locale, t, education }: { items: ExperienceItem[]; locale: Locale; t: Dictionary['experience']; education: boolean }) {
  return (
    <ol>
      {items.map((item) => (
        <li key={item.id} className="group">
          <Reveal className="grid grid-cols-[1rem_minmax(0,1fr)] gap-x-5 md:grid-cols-[minmax(9rem,12rem)_1rem_minmax(0,1fr)] md:gap-x-8">
            <div className="col-start-2 flex flex-wrap items-center gap-3 pt-0.5 pb-3 md:col-start-1 md:row-start-1 md:flex-col md:items-end md:gap-2.5 md:pt-6 md:pb-0 md:text-right">
              <span className={cn('font-mono text-label tracking-[0.08em] uppercase', education ? 'text-accent-fg' : 'text-brand-fg')}>
                {formatExperienceRange(item, locale, t)}
              </span>
              {item.isCurrent && <Status tone={education ? 'accent' : 'brand'}>{t.current}</Status>}
            </div>

            <div aria-hidden="true" className="relative col-start-1 row-span-2 row-start-1 flex justify-center md:col-start-2 md:row-span-1">
              <span className="absolute top-3 bottom-0 w-px bg-gradient-to-b from-line-strong to-line group-last:hidden" />
              <span
                className={cn(
                  'relative mt-1.5 size-3 rounded-full border-2 bg-canvas md:mt-[1.85rem]',
                  education ? 'border-accent' : 'border-brand',
                  item.isCurrent && (education ? 'bg-accent' : 'bg-brand'),
                )}
              />
            </div>

            <div
              className={cn(
                'col-start-2 mb-10 flex min-w-0 flex-col gap-3 md:col-start-3 md:row-start-1 md:mb-12 md:p-6',
                item.isCurrent && 'glass -mx-1 rounded-xl p-5 md:mx-0',
              )}
            >
              <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-2">
                <h3 className="text-h3">{item.role}</h3>
                {item.employmentType && <Tag>{item.employmentType}</Tag>}
              </div>
              <p className="text-body-sm">
                <span className={cn('font-medium', education ? 'text-accent-fg' : 'text-brand-fg')}>{item.organization}</span>
                {item.location && <span className="text-fg-muted"> · {item.location}</span>}
              </p>
              {item.summary.length > 0 && (
                <div className="flex max-w-[68ch] flex-col gap-3 text-body-sm text-fg-muted">
                  {item.summary.map((para, i) => (
                    <p key={i}>{para}</p>
                  ))}
                </div>
              )}
              <TagList items={item.tags} className="mt-1" />
            </div>
          </Reveal>
        </li>
      ))}
    </ol>
  );
}

export function Experience({ section, items, locale, t }: ExperienceProps) {
  const career = items.filter((i) => i.kind === 'career');
  const education = items.filter((i) => i.kind === 'education');

  return (
    <Section id="experience" labelledBy="experience-title">
      <ExperienceTabs
        section={section}
        t={t}
        panels={{
          career: <Timeline items={career} locale={locale} t={t} education={false} />,
          education: <Timeline items={education} locale={locale} t={t} education />,
        }}
      />
    </Section>
  );
}
