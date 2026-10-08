import type { Metadata } from 'next';
import { ProfileDetailsEditor } from '@/features/profile/components/admin/ProfileDetailsEditor';
import { ProfilePageHeader } from '@/features/profile/components/admin/ProfilePageHeader';
import { loadProfileDetails } from '@/features/profile/service';
import { requireAdmin } from '@/server/auth/admin';

export const metadata: Metadata = { title: 'Profile' };

export default async function ProfileDetailsPage() {
  await requireAdmin();
  const initial = await loadProfileDetails();
  return (
    <>
      <ProfilePageHeader current="details" />
      <ProfileDetailsEditor initial={initial} />
    </>
  );
}
