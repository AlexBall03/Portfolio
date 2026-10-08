import type { Metadata } from 'next';
import { SnapshotMetricsEditor } from '@/features/profile/components/admin/SnapshotMetricsEditor';
import { ProfilePageHeader } from '@/features/profile/components/admin/ProfilePageHeader';
import { loadSnapshotMetrics } from '@/features/profile/service';
import { requireAdmin } from '@/server/auth/admin';

export const metadata: Metadata = { title: 'Snapshot metrics' };

export default async function SnapshotMetricsPage() {
  await requireAdmin();
  const initial = await loadSnapshotMetrics();
  return (
    <>
      <ProfilePageHeader current="metrics" />
      <SnapshotMetricsEditor initial={initial} />
    </>
  );
}
