'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useId, useState } from 'react';
import { CONTROL } from '@/components/admin/form/fields';

import { Icon } from '@/components/ui/Icon';
import { RelativeTime } from '@/components/ui/RelativeTime';
import { adminProjectPath } from '@/config/admin';
import { cn } from '@/lib/cn';
import type { ProjectListItem } from '../../types';
import { ProjectStatusPill, publicProjectPath } from './ProjectStatus';

const FILTERS = [
  { key: 'all', label: 'All' },
  { key: 'published', label: 'Published' },
  { key: 'draft', label: 'Drafts' },
] as const;
type Filter = (typeof FILTERS)[number]['key'];

const matches = (p: ProjectListItem, filter: Filter, query: string) =>
  (filter === 'all' || (filter === 'published' ? p.status === 'published' : p.status !== 'published')) &&
  (!query || `${p.name} ${p.slug}`.toLowerCase().includes(query));

const rowLink = 'inline-flex h-8 items-center gap-1.5 rounded-sm px-2 text-body-sm text-fg-muted transition-colors hover:bg-fg/[0.06] hover:text-fg [&_svg]:size-4';

/** All projects in editorial order, searchable and filterable by status. */
export function ProjectList({ projects }: { projects: ProjectListItem[] }) {
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<Filter>('all');
  const searchId = useId();
  const shown = projects.filter((p) => matches(p, filter, query.trim().toLowerCase()));
  const count = (f: Filter) => projects.filter((p) => matches(p, f, '')).length;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative sm:w-72">
          <label htmlFor={searchId} className="sr-only">
            Search projects
          </label>
          <Icon name="search" className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-fg-faint" />
          <input
            id={searchId}
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by name or URL"
            className={cn(CONTROL, 'pl-9')}
          />
        </div>
        <div role="group" aria-label="Filter by status" className="flex gap-1">
          {FILTERS.map((f) => (
            <button
              key={f.key}
              type="button"
              aria-pressed={filter === f.key}
              onClick={() => setFilter(f.key)}
              className={cn(
                'inline-flex h-9 items-center gap-2 rounded-full border px-3.5 text-body-sm transition-colors',
                filter === f.key
                  ? 'border-brand/40 bg-brand-soft font-medium text-brand-fg'
                  : 'border-line text-fg-muted hover:border-line-strong hover:text-fg',
              )}
            >
              {f.label}
              <span className="font-mono text-micro tabular-nums opacity-70">{count(f.key)}</span>
            </button>
          ))}
        </div>
      </div>

      <p aria-live="polite" className="sr-only">
        {shown.length} {shown.length === 1 ? 'project' : 'projects'} shown
      </p>

      {shown.length === 0 ? (
        <p className="rounded-md border border-dashed border-line-strong px-4 py-10 text-center text-body-sm text-fg-muted">
          {projects.length === 0 ? 'No projects yet. Create the first one.' : 'No projects match.'}
        </p>
      ) : (
        <ul className="divide-y divide-line overflow-hidden rounded-md border border-line bg-surface-raised/40">
          {shown.map((p) => (
            <li key={p.id} className="flex flex-col gap-3 px-4 py-3.5 md:flex-row md:items-center md:gap-5">
              <div className="flex min-w-0 flex-1 items-center gap-4">
                <div className="relative hidden aspect-[16/10] w-20 shrink-0 overflow-hidden rounded-sm border border-line bg-surface-inset sm:block">
                  {p.cover ? (
                    <Image src={p.cover.src} alt="" fill sizes="80px" className="object-cover object-top" />
                  ) : (
                    <Icon name="layers" className="absolute inset-0 m-auto size-5 text-fg-faint" />
                  )}
                </div>
                <div className="flex min-w-0 flex-col gap-1">
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                    <Link href={adminProjectPath(p.id)} className="truncate font-medium text-fg hover:text-brand-fg">
                      {p.name}
                    </Link>
                    {p.featured && (
                      <span className="inline-flex items-center gap-1 font-mono text-micro text-accent-fg uppercase">
                        <Icon name="star" className="size-3.5" /> Featured
                      </span>
                    )}
                  </div>
                  <span className="truncate font-mono text-micro text-fg-faint">{publicProjectPath(p.slug)}</span>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-x-4 gap-y-2 md:w-[24rem] md:flex-nowrap md:justify-end">
                <ProjectStatusPill status={p.status} />
                <span className="text-micro whitespace-nowrap text-fg-faint">
                  Edited <RelativeTime iso={p.updatedAt} />
                </span>
              </div>
              <div className="-ml-2 flex shrink-0 gap-0.5 md:ml-0">
                <Link href={adminProjectPath(p.id)} className={rowLink} aria-label={`Edit ${p.name}`}>
                  Edit
                </Link>
                <Link href={adminProjectPath(p.id, 'preview')} className={rowLink} aria-label={`Preview ${p.name}`}>
                  Preview
                </Link>
                {p.status === 'published' && (
                  <a
                    href={publicProjectPath(p.slug)}
                    target="_blank"
                    rel="noreferrer"
                    className={rowLink}
                    aria-label={`View ${p.name} on the live site`}
                  >
                    Live <Icon name="arrowUpRight" />
                  </a>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
