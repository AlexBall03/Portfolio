import type { Metadata } from 'next';
import { ProfileHighlightsEditor } from '@/features/profile/components/admin/ProfileHighlightsEditor';
import { ProfilePageHeader } from '@/features/profile/components/admin/ProfilePageHeader';
import { loadProfileHighlights } from '@/features/profile/service';
import { requireAdmin } from '@/server/auth/admin';

export const metadata: Metadata = { title: 'Profile highlights' };

export default async function ProfileHighlightsPage() {
  await requireAdmin();
  const initial = await loadProfileHighlights();
  return (
    <>
      <ProfilePageHeader current="highlights" />
      <ProfileHighlightsEditor initial={initial} />
    </>
  );
}
