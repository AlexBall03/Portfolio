import { redirect } from 'next/navigation';
import { type ReactNode, Suspense } from 'react';
import { AdminLoading } from '@/components/admin/AdminLoading';
import { AdminShell } from '@/components/admin/AdminShell';
import { ADMIN_SIGN_IN_PATH } from '@/config/admin';
import { getSiteSettings } from '@/features/site/queries';
import { getAdminProfile, getAuthorization, requireAdmin } from '@/server/auth/admin';

/**
 * Every console page sits under this layout: the second authorization layer
 * after the proxy. The session is read behind Suspense (Cache Components),
 * and the shell, navigation, and page only render once `requireAdmin()`
 * has succeeded, so nothing protected can flash first.
 */
export default function ConsoleLayout({ children }: { children: ReactNode }) {
  return (
    <Suspense fallback={<AdminLoading />}>
      <Console>{children}</Console>
    </Suspense>
  );
}

async function Console({ children }: { children: ReactNode }) {
  // The proxy normally redirects signed-out visitors (keeping their return path); this is the fallback.
  if ((await getAuthorization()).status === 'signed-out') redirect(ADMIN_SIGN_IN_PATH);
  await requireAdmin();

  const [profile, settings] = await Promise.all([getAdminProfile(), getSiteSettings()]);
  return (
    <AdminShell profile={profile} brandMark={settings.brandMark}>
      {children}
    </AdminShell>
  );
}
