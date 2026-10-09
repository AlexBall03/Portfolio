import type { Metadata } from 'next';
import { ProfileHeadshotEditor } from '@/features/profile/components/admin/ProfileHeadshotEditor';
import { ProfilePageHeader } from '@/features/profile/components/admin/ProfilePageHeader';
import { loadHeadshot } from '@/features/profile/service';
import { blobStore } from '@/integrations/blob/store';
import { requireAdmin } from '@/server/auth/admin';

export const metadata: Metadata = { title: 'Headshot' };

export default async function ProfileHeadshotPage() {
  await requireAdmin();
  const initial = await loadHeadshot();
  return (
    <>
      <ProfilePageHeader current="headshot" />
      <ProfileHeadshotEditor initial={initial} storageConfigured={blobStore.configured()} />
    </>
  );
}
