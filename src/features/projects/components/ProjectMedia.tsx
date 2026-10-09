import Image from 'next/image';
import type { CSSProperties } from 'react';
import { cn } from '@/lib/cn';
import { hueFor } from '../identity';
import type { Project } from '../types';

/** What the window's address bar shows: the demo's host, else the slug. */
function addressFor(project: Pick<Project, 'slug' | 'links'>): string {
  if (project.links.demo) {
    try {
      return new URL(project.links.demo).host;
    } catch {
      // Malformed URL: fall through to the slug.
    }
  }
  return project.slug;
}

interface ProjectMediaProps {
  project: Pick<Project, 'slug' | 'name' | 'cover' | 'links'>;
  size?: 'card' | 'detail';
  sizes: string;
  priority?: boolean;
  className?: string;
}

/**
 * A project's visual: a browser window on the project's tinted backdrop. With
 * a cover image (a screenshot, via `project_media`) the window shows it;
 * without one it shows a wireframe of a page, so the slot reads as "the app"
 * rather than an empty placeholder.
 */
export function ProjectMedia({ project, size = 'card', sizes, priority, className }: ProjectMediaProps) {
  const detail = size === 'detail';
  return (
    <div
      className={cn('project-identity relative isolate overflow-hidden', className)}
      style={{ '--hue': hueFor(project.slug) } as CSSProperties}
    >
      <div
        className={cn(
          'absolute inset-x-5 top-6 -bottom-2 flex flex-col overflow-hidden rounded-t-lg border border-b-0 border-line-strong bg-surface/80 shadow-lg transition-transform duration-500 ease-out group-hover:-translate-y-1 sm:inset-x-8 sm:top-8',
          detail && 'lg:inset-x-12 lg:top-12',
        )}
      >
        <div className="flex h-8 shrink-0 items-center gap-3 border-b border-line px-3">
          <span aria-hidden="true" className="flex gap-1.5">
            <span className="size-2 rounded-full bg-fg/20" />
            <span className="size-2 rounded-full bg-fg/20" />
            <span className="size-2 rounded-full bg-fg/20" />
          </span>
          <span className="mx-auto min-w-0 truncate rounded-sm bg-fg/[0.05] px-3 py-0.5 font-mono text-micro text-fg-faint">
            {addressFor(project)}
          </span>
          <span aria-hidden="true" className="w-[2.375rem]" />
        </div>

        <div className="relative flex-1">
          {project.cover ? (
            <Image
              src={project.cover.src}
              alt={project.cover.alt}
              fill
              sizes={sizes}
              priority={priority}
              className="object-cover object-top"
            />
          ) : (
            <Wireframe />
          )}
        </div>
      </div>
    </div>
  );
}

/** A generic page sketch tinted by the project's hue. Decorative only. */
function Wireframe() {
  const bar = 'rounded-full bg-fg/[0.08]';
  return (
    <div aria-hidden="true" className="flex h-full flex-col gap-5 p-5 sm:p-6">
      <div className="flex items-center justify-between">
        <span className="h-2 w-14 rounded-full bg-[oklch(0.7_0.14_var(--hue)/0.6)]" />
        <span className="flex gap-2">
          <span className={cn(bar, 'h-1.5 w-8')} />
          <span className={cn(bar, 'h-1.5 w-8')} />
          <span className={cn(bar, 'h-1.5 w-8')} />
        </span>
      </div>
      <div className="flex flex-col gap-2.5 pt-2">
        <span className="h-3 w-3/5 rounded-full bg-fg/[0.14]" />
        <span className={cn(bar, 'h-2 w-4/5')} />
        <span className={cn(bar, 'h-2 w-2/3')} />
      </div>
      <div className="grid flex-1 grid-cols-3 gap-3">
        <span className="rounded-md border border-line bg-[oklch(0.6_0.16_var(--hue)/0.12)]" />
        <span className="rounded-md border border-line bg-fg/[0.03]" />
        <span className="rounded-md border border-line bg-fg/[0.03]" />
      </div>
    </div>
  );
}
