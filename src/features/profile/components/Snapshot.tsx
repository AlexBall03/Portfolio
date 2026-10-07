import { Icon } from '@/components/ui/Icon';
import { Reveal } from '@/components/ui/Reveal';
import { Section } from '@/components/ui/Section';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { Stat, statDividers } from '@/components/ui/Stat';
import type { SectionContent } from '@/features/site/types';
import { cn } from '@/lib/cn';
import type { SnapshotMetric } from '../types';

/** Current metrics in one glass data panel, divided by hairlines rather than boxed one by one. */
export function Snapshot({ section, metrics }: { section: SectionContent; metrics: SnapshotMetric[] }) {
  if (!metrics.length) return null;
  return (
    <Section id="snapshot" labelledBy="snapshot-title">
      <SectionHeader index="01" content={section} as="h1" id="snapshot-title" />
      <Reveal>
        <dl className="glass grid grid-cols-2 rounded-xl lg:grid-cols-4">
          {metrics.map((m, i) => (
            <Stat
              key={m.label}
              value={m.value}
              suffix={m.suffix}
              label={m.label}
              note={m.note}
              tone={m.accent === 'gold' ? 'accent' : 'brand'}
              icon={<Icon name={m.icon} />}
              className={cn('p-5 sm:p-8', statDividers(i))}
            />
          ))}
        </dl>
      </Reveal>
    </Section>
  );
}
