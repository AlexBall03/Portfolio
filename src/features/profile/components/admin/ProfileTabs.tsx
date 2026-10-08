import { SectionTabs } from '@/components/admin/SectionTabs';
import { ADMIN_PROFILE_PATH } from '@/config/admin';

const TABS = [
  { key: 'details', label: 'Details', href: ADMIN_PROFILE_PATH },
  { key: 'roles', label: 'Roles', href: `${ADMIN_PROFILE_PATH}/roles` },
  { key: 'highlights', label: 'Highlights', href: `${ADMIN_PROFILE_PATH}/highlights` },
  { key: 'metrics', label: 'Metrics', href: `${ADMIN_PROFILE_PATH}/metrics` },
] as const;

export type ProfileTab = (typeof TABS)[number]['key'];

/** Sub-navigation between the Profile editors (each is its own form and save). */
export function ProfileTabs({ current }: { current: ProfileTab }) {
  return <SectionTabs label="Profile sections" tabs={TABS} current={current} />;
}
