import Image from 'next/image';
import { Icon } from '@/components/ui/Icon';
import { InlineText } from '@/components/ui/RichText';
import { Status } from '@/components/ui/Status';
import { copy } from '@/config/copy';
import { cn } from '@/lib/cn';
import { formatMilestoneDate } from '../format';
import type { Milestone } from '../types';

/**
 * A project's curated development story, oldest first. One hairline rail
 * with a node per milestone: dates sit in their own column from `md`, above
 * the title on small screens. Launches and releases get a filled node.
 */
export function MilestoneTimeline({ milestones }: { milestones: Milestone[] }) {
  const t = copy.projects;
  return (
    <ol className="relative flex flex-col">
      {milestones.map((m, i) => {
        const major = m.kind === 'launch' || m.kind === 'release';
        const last = i === milestones.length - 1;
        return (
          <li key={m.id} className="grid gap-x-8 md:grid-cols-[9rem_minmax(0,1fr)]">
            <time
              dateTime={m.date}
              className="hidden pt-0.5 text-right font-mono text-label text-fg-muted tabular-nums md:block"
            >
              {formatMilestoneDate(m.date, m.precision)}
            </time>
            <div className={cn('relative flex flex-col gap-2.5 border-l border-line pl-7', !last && 'pb-10')}>
              <span
                aria-hidden="true"
                className={cn(
                  'absolute top-1.5 -left-[5px] size-[9px] rounded-full border',
                  major ? 'border-brand bg-brand ring-4 ring-brand/15' : 'border-line-strong bg-canvas',
                )}
              />
              <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
                <time dateTime={m.date} className="font-mono text-label text-fg-muted tabular-nums md:hidden">
                  {formatMilestoneDate(m.date, m.precision)}
                </time>
                <span className="font-mono text-micro tracking-[0.14em] text-accent-fg uppercase">{t.milestoneKinds[m.kind]}</span>
                {m.hidden && <Status>{t.hidden}</Status>}
              </div>
              <h3 className="text-body-lg font-medium text-fg">{m.title}</h3>
              {m.description && (
                <p className="max-w-[60ch] text-body-sm text-fg-muted">
                  <InlineText text={m.description} />
                </p>
              )}
              {m.image && (
                <div className="relative mt-1 aspect-[16/9] w-full max-w-sm overflow-hidden rounded-md border border-line bg-surface-inset">
                  <Image src={m.image.src} alt={m.image.alt} fill sizes="384px" className="object-cover object-top" />
                </div>
              )}
              {m.url && (
                <a
                  href={m.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group inline-flex items-center gap-1.5 self-start text-body-sm text-brand-fg hover:underline [&_svg]:size-3.5"
                >
                  {t.milestoneLink}
                  <span className="sr-only">: {m.title}</span>
                  <Icon name="arrowUpRight" />
                </a>
              )}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
