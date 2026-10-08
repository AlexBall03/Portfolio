import type { Metadata } from 'next';
import Link from 'next/link';
import { AdminPageHeader } from '@/components/admin/AdminPageHeader';
import { ADMIN_PROFILE_PATH } from '@/config/admin';
import { ConfigurationEditor } from '@/features/site/components/admin/ConfigurationEditor';
import { loadSiteSettings } from '@/features/site/service';
import { requireAdmin } from '@/server/auth/admin';

export const metadata: Metadata = { title: 'Configuration' };

export default async function ConfigurationPage() {
  await requireAdmin();
  const initial = await loadSiteSettings();
  return (
    <>
      <AdminPageHeader
        eyebrow="Site"
        title="Configuration"
        lead={
          <>
            Site-wide settings. Personal content lives in{' '}
            <Link href={ADMIN_PROFILE_PATH} className="text-brand-fg underline-offset-4 hover:underline">
              Profile
            </Link>
            . Saving updates every page immediately.
          </>
        }
      />
      <ConfigurationEditor initial={initial} />
    </>
  );
}
