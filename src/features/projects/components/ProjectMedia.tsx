import Image from 'next/image';
import type { CSSProperties } from 'react';
import { cn } from '@/lib/cn';
import type { Project } from '../types';

/** Stable hue per project (blue → indigo → teal range) so each identity is distinct but on-brand. */
function hueFor(slug: string): number {
  let h = 0;
  for (const ch of slug) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return 200 + (h % 80);
}

function initials(name: string): string {
  const words = name.split(/\s+/).filter(Boolean);
  return words
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? '')
    .join('');
}

interface ProjectMediaProps {
  project: Pick<Project, 'slug' | 'name' | 'cover' | 'technologies'>;
  /** Display index, e.g. "01". */
  index?: string;
  size?: 'card' | 'detail';
  sizes: string;
  priority?: boolean;
  className?: string;
}

/**
 * A project's visual. With a cover image it frames the image; without one it
 * renders a designed identity panel from the project's own data (monogram,
 * stack, a slug-seeded tint) instead of an empty placeholder.
 */
export function ProjectMedia({ project, index, size = 'card', sizes, priority, className }: ProjectMediaProps) {
  if (project.cover) {
    return (
      <div className={cn('relative overflow-hidden bg-surface-inset', className)}>
        <Image src={project.cover.src} alt={project.cover.alt} fill sizes={sizes} priority={priority} className="object-cover" />
      </div>
    );
  }

  const stack = project.technologies.slice(0, size === 'detail' ? 6 : 4);
  return (
    <div
      aria-hidden="true"
      className={cn('project-identity relative isolate overflow-hidden', className)}
      style={{ '--hue': hueFor(project.slug) } as CSSProperties}
    >
      <span className="absolute -top-16 -right-16 size-56 rounded-full border border-line" />
      <span className="absolute -top-6 -right-6 size-32 rounded-full border border-line" />
      <span className="absolute top-12 right-12 size-1.5 rounded-full bg-accent" />

      <span className="absolute top-5 left-5 font-mono text-micro tracking-[0.14em] text-fg-faint uppercase sm:top-6 sm:left-6">
        {index && <span className="text-accent-fg">{index}</span>}
        {index && ' / '}
        {project.slug}
      </span>

      <span
        className={cn(
          'absolute bottom-4 left-5 font-display leading-none font-semibold tracking-[-0.06em] text-fg/90 transition-transform duration-500 ease-out group-hover:-translate-y-1 sm:left-6',
          size === 'detail' ? 'text-[clamp(6rem,4rem+10vw,11rem)]' : 'text-[clamp(5rem,3.5rem+6vw,8rem)]',
        )}
      >
        {initials(project.name)}
      </span>

      {stack.length > 0 && (
        <ul className="absolute right-5 bottom-5 flex flex-col items-end gap-1 font-mono text-micro text-fg-muted sm:right-6 sm:bottom-6">
          {stack.map((tech) => (
            <li key={tech.slug} className="flex items-center gap-2">
              {tech.name}
              <span className="h-px w-3 bg-brand-fg/60" />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
