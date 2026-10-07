import { CountUp } from '@/components/ui/CountUp';
import { Icon } from '@/components/ui/Icon';
import { Reveal } from '@/components/ui/Reveal';
import { SectionHead } from '@/components/ui/SectionHead';
import type { SectionContent } from '@/features/site/types';
import type { SnapshotMetric } from '../types';

export function Snapshot({ section, metrics }: { section: SectionContent; metrics: SnapshotMetric[] }) {
  if (!metrics.length) return null;
  return (
    <section id="snapshot" className="band" aria-labelledby="snapshot-title">
      <div className="wrap">
        <SectionHead index="01" content={section} as="h1" id="snapshot-title" />
        <div className="snap-grid">
          {metrics.map((m, i) => (
            <Reveal key={m.label} className="metric card card-hover" delay={i * 80}>
              <div className={`ic ${m.accent === 'gold' ? 'gold' : ''}`}>
                <Icon name={m.icon} />
              </div>
              <div className="val">
                <CountUp value={m.value} suffix={m.suffix} />
              </div>
              <div className="k">{m.label}</div>
              <div className="note">{m.note}</div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
