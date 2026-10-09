import type { ReactNode } from 'react';
import { Icon } from '@/components/ui/Icon';
import { Reveal } from '@/components/ui/Reveal';
import { Section } from '@/components/ui/Section';
import { SectionHeader } from '@/components/ui/SectionHeader';
import type { SectionContent } from '@/features/site/types';
import type { Locale } from '@/i18n/config';
import type { Dictionary } from '@/i18n/get-dictionary';
import type { SkillsOverview } from '../types';
import { TechTags } from './TechTags';

interface ToolkitProps {
  section: SectionContent;
  skills: SkillsOverview;
  usage: ReadonlyMap<string, number>;
  locale: Locale;
  t: Dictionary['skills'];
  /** A compact companion beside the list (the GitHub pulse), or nothing. */
  aside?: ReactNode;
}

/**
 * Home: the stack at a glance. The same categories as About's Stack, as a
 * compact hairline list whose technologies link to the projects that use them.
 * Learning categories stay on About.
 */
export function Toolkit({ section, skills, usage, locale, t, aside }: ToolkitProps) {
  if (!skills.stack.length) return null;
  return (
    <Section id="toolkit" labelledBy="toolkit-title">
      <SectionHeader content={section} id="toolkit-title" />
      <div className={aside ? 'grid items-start gap-10 lg:grid-cols-[minmax(0,1fr)_20rem] lg:gap-14' : undefined}>
        <Reveal>
          <ul className="border-b border-line">
            {skills.stack.map((cat) => (
              <li key={cat.slug} className="grid gap-3 border-t border-line py-5 sm:grid-cols-[11rem_minmax(0,1fr)] sm:gap-8">
                <h3 className="flex items-center gap-2.5 font-mono text-label tracking-[0.14em] text-fg-muted uppercase sm:pt-1.5">
                  <Icon name={cat.icon} className={`size-4 shrink-0 ${cat.accent === 'gold' ? 'text-accent-fg' : 'text-brand-fg'}`} />
                  {cat.name}
                </h3>
                <TechTags technologies={cat.technologies} usage={usage} locale={locale} t={t} />
              </li>
            ))}
          </ul>
        </Reveal>
        {aside && <Reveal delay={120}>{aside}</Reveal>}
      </div>
    </Section>
  );
}
