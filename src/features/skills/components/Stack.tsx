import { Icon } from '@/components/ui/Icon';
import { Reveal } from '@/components/ui/Reveal';
import { Section } from '@/components/ui/Section';
import { SectionHeader } from '@/components/ui/SectionHeader';
import type { SectionContent } from '@/features/site/types';
import type { Locale } from '@/i18n/config';
import type { Dictionary } from '@/i18n/get-dictionary';
import type { SkillsOverview } from '../types';
import { TechTags } from './TechTags';

interface StackProps {
  section: SectionContent;
  skills: SkillsOverview;
  /** Published projects per technology slug: used technologies link to their projects. */
  usage: ReadonlyMap<string, number>;
  locale: Locale;
  t: Dictionary['skills'];
}

/** Skills as a scannable definition list: category on the left, technologies on the right. */
export function Stack({ section, skills, usage, locale, t }: StackProps) {
  return (
    <Section id="stack" labelledBy="stack-title">
      <SectionHeader content={section} id="stack-title" />

      <Reveal>
        <dl className="border-b border-line">
          {skills.stack.map((cat) => (
            <div
              key={cat.slug}
              className="group/row grid gap-4 border-t border-line py-7 transition-colors duration-200 md:grid-cols-[15rem_minmax(0,1fr)] md:gap-10"
            >
              <dt className="flex items-center gap-3 font-mono text-label tracking-[0.14em] text-fg uppercase">
                <span
                  className={`grid size-8 shrink-0 place-items-center rounded-md border border-line bg-surface-raised/60 ${cat.accent === 'gold' ? 'text-accent-fg' : 'text-brand-fg'}`}
                >
                  <Icon name={cat.icon} className="size-4" />
                </span>
                {cat.name}
              </dt>
              <dd className="md:pt-0.5">
                <TechTags technologies={cat.technologies} usage={usage} locale={locale} t={t} />
              </dd>
            </div>
          ))}
        </dl>
      </Reveal>

      {skills.learning.map((cat) => (
        <Reveal key={cat.slug} className="mt-8">
          <div className="grid items-center gap-5 rounded-lg border border-accent/30 bg-accent-soft px-6 py-6 md:grid-cols-[15rem_minmax(0,1fr)] md:gap-10">
            <div className="flex items-center gap-3">
              <Icon name={cat.icon} className="size-5 shrink-0 text-accent-fg" />
              <div className="flex flex-col">
                {section.aside && (
                  <span className="font-mono text-micro tracking-[0.14em] text-accent-fg uppercase">{section.aside}</span>
                )}
                <h3 className="text-h3">{cat.name}</h3>
              </div>
            </div>
            <TechTags technologies={cat.technologies} usage={usage} locale={locale} t={t} tone="accent" />
          </div>
        </Reveal>
      ))}
    </Section>
  );
}
