import type { Metadata } from 'next';
import Link from 'next/link';
import { AdminPageHeader } from '@/components/admin/AdminPageHeader';
import { Icon } from '@/components/ui/Icon';
import { Status } from '@/components/ui/Status';
import { ADMIN_CONTENT_PATH } from '@/config/admin';
import { listPageCopy } from '@/features/site/service';
import { PAGES, SECTIONS } from '@/features/site/types';
import { requireAdmin } from '@/server/auth/admin';

export const metadata: Metadata = { title: 'Page content' };

export default async function PageContentIndex() {
  await requireAdmin();
  const pages = await listPageCopy();
  return (
    <>
      <AdminPageHeader
        eyebrow="Site"
        title="Page content"
        lead="Search and sharing copy for each public page, and the headings of the sections it shows. Page layout stays in code."
      />
      <ul className="divide-y divide-line border-y border-line">
        {pages.map((p) => (
          <li key={p.page}>
            <Link
              href={`${ADMIN_CONTENT_PATH}/${p.page}`}
              className="group flex flex-col gap-2 py-4 sm:flex-row sm:items-center sm:gap-6"
            >
              <span className="flex min-w-0 flex-1 flex-col gap-1">
                <span className="flex items-center gap-3">
                  <span className="font-medium text-fg group-hover:text-brand-fg">{p.label}</span>
                  <code className="font-mono text-micro text-fg-faint">{p.path}</code>
                </span>
                <span className="text-body-sm text-fg-muted">
                  {['Search and sharing', ...PAGES[p.page].sections.map((k) => SECTIONS[k].label)].join(' · ')}
                </span>
              </span>
              <span className="flex items-center gap-3">
                {!p.complete && <Status tone="accent">No description yet</Status>}
                <Icon
                  name="arrowRight"
                  className="size-4 text-fg-faint transition-[translate,color] group-hover:translate-x-0.5 group-hover:text-fg"
                />
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </>
  );
}
