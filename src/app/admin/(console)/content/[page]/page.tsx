import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { AdminPageHeader } from '@/components/admin/AdminPageHeader';
import { ADMIN_CONTENT_PATH } from '@/config/admin';
import { PageCopyEditor } from '@/features/site/components/admin/PageCopyEditor';
import { loadPageCopy } from '@/features/site/service';
import { PAGE_KEYS, PAGES, type PageKey } from '@/features/site/types';
import { requireAdmin } from '@/server/auth/admin';

export const metadata: Metadata = { title: 'Page content' };

const isPageKey = (value: string): value is PageKey => (PAGE_KEYS as readonly string[]).includes(value);

export default async function PageContentPage({ params }: { params: Promise<{ page: string }> }) {
  await requireAdmin();
  const { page } = await params;
  if (!isPageKey(page)) notFound();
  const initial = await loadPageCopy(page);
  const { label, path } = PAGES[page];
  return (
    <>
      <AdminPageHeader
        eyebrow="Page content"
        title={label}
        lead={
          <>
            Copy for <code className="font-mono text-label">{path}</code>.{' '}
            <Link href={ADMIN_CONTENT_PATH} className="text-brand-fg underline-offset-4 hover:underline">
              All pages
            </Link>
          </>
        }
      />
      <PageCopyEditor initial={initial} />
    </>
  );
}
