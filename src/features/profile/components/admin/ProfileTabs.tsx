import Link from 'next/link';
import { ADMIN_PROFILE_PATH } from '@/config/admin';
import { cn } from '@/lib/cn';

const TABS = [
  { key: 'details', label: 'Details', href: ADMIN_PROFILE_PATH },
  { key: 'roles', label: 'Roles', href: `${ADMIN_PROFILE_PATH}/roles` },
  { key: 'highlights', label: 'Highlights', href: `${ADMIN_PROFILE_PATH}/highlights` },
  { key: 'metrics', label: 'Metrics', href: `${ADMIN_PROFILE_PATH}/metrics` },
] as const;

export type ProfileTab = (typeof TABS)[number]['key'];

/** Sub-navigation between the Profile editors (each is its own form and save). */
export function ProfileTabs({ current }: { current: ProfileTab }) {
  return (
    <nav aria-label="Profile sections" className="-mt-2 overflow-x-auto">
      <ul className="flex gap-1">
        {TABS.map((tab) => {
          const active = tab.key === current;
          return (
            <li key={tab.key}>
              <Link
                href={tab.href}
                aria-current={active ? 'page' : undefined}
                className={cn(
                  'inline-flex h-9 items-center rounded-full border px-4 text-body-sm whitespace-nowrap transition-colors',
                  active
                    ? 'border-brand/40 bg-brand-soft font-medium text-brand-fg'
                    : 'border-line text-fg-muted hover:border-line-strong hover:text-fg',
                )}
              >
                {tab.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
