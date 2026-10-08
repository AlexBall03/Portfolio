import { Icon } from '@/components/ui/Icon';
import { Reveal } from '@/components/ui/Reveal';
import { Section } from '@/components/ui/Section';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { TagList } from '@/components/ui/Tag';
import type { SectionContent } from '@/features/site/types';
import type { SkillsOverview } from '../types';

interface StackProps {
  section: SectionContent;
  skills: SkillsOverview;
}

/** Skills as a scannable definition list: category on the left, technologies on the right. */
export function Stack({ section, skills }: StackProps) {
  return (
    <Section id="stack" labelledBy="stack-title">
      <SectionHeader content={section} id="stack-title" />

      <Reveal>
        <dl className="border-b border-line">
          {skills.stack.map((cat) => (
            <div key={cat.slug} className="grid gap-4 border-t border-line py-7 md:grid-cols-[15rem_minmax(0,1fr)] md:gap-10">
              <dt className="flex items-center gap-3 font-mono text-label tracking-[0.14em] text-fg uppercase">
                <Icon name={cat.icon} className="size-4 shrink-0 text-brand-fg" />
                {cat.name}
              </dt>
              <dd>
                <TagList items={cat.technologies.map((s) => s.name)} className="[&>li]:px-2.5 [&>li]:py-1.5 [&>li]:text-label" />
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
            <TagList items={cat.technologies.map((s) => s.name)} className="[&>li]:border-accent/25" />
          </div>
        </Reveal>
      ))}
    </Section>
  );
}
