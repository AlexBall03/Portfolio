import { cn } from '@/lib/cn';

/** Long-form paragraphs at a comfortable measure. The first paragraph can lead. */
export function Prose({ paragraphs, lead = false, className }: { paragraphs: string[]; lead?: boolean; className?: string }) {
  return (
    <div className={cn('flex max-w-[65ch] flex-col gap-5 text-body text-fg-muted', className)}>
      {paragraphs.map((p, i) => (
        <p key={i} className={cn(lead && i === 0 && 'text-body-lg text-fg')}>
          {p}
        </p>
      ))}
    </div>
  );
}
