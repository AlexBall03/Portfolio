import Link from 'next/link';
import { techQuery } from '@/features/projects/filter';
import type { Technology } from '@/features/projects/types';
import type { Locale } from '@/i18n/config';
import type { Dictionary } from '@/i18n/get-dictionary';
import { fill, localizedPath } from '@/i18n/paths';
import { cn } from '@/lib/cn';

interface TechTagsProps {
  technologies: Technology[];
  /** Published projects per technology slug (`usageCounts`). */
  usage: ReadonlyMap<string, number>;
  locale: Locale;
  t: Dictionary['skills'];
  /** `accent` for the learning banners. */
  tone?: 'default' | 'accent';
  label?: string;
  className?: string;
}

const BASE = 'inline-flex items-center gap-1.5 rounded-sm border px-2.5 py-1.5 font-mono text-label';

/**
 * Technology tags. One used by published projects links to the projects list
 * filtered to it (`/projects?tech=…`) and shows how many; the rest stay plain
 * text, so nothing promises work that isn't there.
 */
export function TechTags({ technologies, usage, locale, t, tone = 'default', label, className }: TechTagsProps) {
  if (!technologies.length) return null;
  const projects = localizedPath(locale, '/projects');
  const plain = tone === 'accent' ? 'border-accent/25 bg-fg/[0.03] text-fg-muted' : 'border-line bg-fg/[0.03] text-fg-muted';

  return (
    <ul aria-label={label} className={cn('flex flex-wrap gap-1.5', className)}>
      {technologies.map((tech) => {
        const count = usage.get(tech.slug) ?? 0;
        if (!count) {
          return (
            <li key={tech.slug} className={cn(BASE, plain)}>
              {tech.name}
            </li>
          );
        }
        const usedIn = count === 1 ? t.usedInOne : fill(t.usedInMany, { count });
        return (
          <li key={tech.slug}>
            <Link
              href={`${projects}${techQuery(tech.slug)}`}
              aria-label={`${tech.name} — ${usedIn}`}
              title={fill(t.projectsWith, { name: tech.name })}
              className={cn(
                BASE,
                'border-line-strong bg-surface-raised/50 text-fg transition-[border-color,background-color,color] duration-200 ease-standard',
                'hover:border-brand/50 hover:bg-brand-soft hover:text-brand-fg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus',
              )}
            >
              {tech.name}
              <span aria-hidden="true" className="rounded-full bg-fg/[0.07] px-1.5 text-micro tabular-nums text-fg-muted">
                {count}
              </span>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
