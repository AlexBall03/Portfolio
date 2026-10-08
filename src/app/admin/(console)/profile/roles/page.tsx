import type { Metadata } from 'next';
import { ProfileRolesEditor } from '@/features/profile/components/admin/ProfileRolesEditor';
import { ProfilePageHeader } from '@/features/profile/components/admin/ProfilePageHeader';
import { loadProfileRoles } from '@/features/profile/service';
import { requireAdmin } from '@/server/auth/admin';

export const metadata: Metadata = { title: 'Profile roles' };

export default async function ProfileRolesPage() {
  await requireAdmin();
  const initial = await loadProfileRoles();
  return (
    <>
      <ProfilePageHeader current="roles" />
      <ProfileRolesEditor initial={initial} />
    </>
  );
}
