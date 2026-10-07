import Link from 'next/link';
import type { ReactNode } from 'react';
import { BrandMark } from '@/components/layout/BrandMark';
import { ThemeSwitch } from '@/components/layout/Preferences';
import { Icon } from '@/components/ui/Icon';
import { ADMIN_NAV, ADMIN_PATH } from '@/config/admin';
import { getDictionary } from '@/i18n/get-dictionary';
import { cn } from '@/lib/cn';
import type { AdminProfile } from '@/server/auth/admin';
import { AccountButton, SignOutButton } from './AccountActions';
import { AdminNav } from './AdminNav';
import { AdminTopBar } from './AdminTopBar';
import { adminGroupTitle, adminInset, type AdminPlacement, adminUtilityRow, stagger } from './styles';

/** The admin is English-only, so the shared theme control uses the English labels. */
const toggles = getDictionary('en').toggles;
const NAV_COUNT = ADMIN_NAV.reduce((n, g) => n + g.items.length, 0);

export function AdminIdentity({ brandMark }: { brandMark: string }) {
  return (
    <Link href={ADMIN_PATH} className="flex h-10 min-w-0 items-center gap-2.5 rounded-md px-2.5 text-body">
      <BrandMark text={brandMark} className="truncate" />
      <span className="rounded-sm border border-accent/35 bg-accent-soft px-1.5 py-0.5 font-mono text-micro tracking-[0.12em] text-accent-fg uppercase">
        Admin
      </span>
    </Link>
  );
}

/**
 * Everything below the brand row, shared by the rail and the drawer: the
 * navigation, then the utilities pinned to the bottom (as in the public
 * drawer): view site, theme, and the account.
 */
function Panel({ profile, placement }: { profile: AdminProfile; placement: AdminPlacement }) {
  const drawer = placement === 'drawer';
  const inset = adminInset[placement];
  const row = cn(adminUtilityRow, inset);
  const item = (i: number) => (drawer ? { style: stagger(1 + NAV_COUNT + i), className: 'drawer-item' } : {});

  return (
    <>
      <AdminNav placement={placement} />

      <div className="mt-auto flex flex-col border-t border-line">
        <div {...item(0)}>
          <a href="/" target="_blank" rel="noopener" className={row}>
            <Icon name="globe" />
            <span>View site</span>
            <span className="sr-only">(opens in a new tab)</span>
            <Icon name="arrowUpRight" className="ml-auto text-fg-faint" />
          </a>
        </div>

        <div {...item(1)} className={cn(item(1).className, 'border-t border-line')}>
          <div className={cn('flex items-center justify-between gap-3 py-3', inset)}>
            <span className={adminGroupTitle} aria-hidden="true">
              {toggles.theme}
            </span>
            <ThemeSwitch t={toggles} />
          </div>
        </div>

        <div {...item(2)} className={cn(item(2).className, 'border-t border-line')}>
          <div className={cn('flex items-center gap-3 pt-4 pb-2', inset)}>
            {profile.imageUrl ? (
              // Clerk-hosted avatar; a plain <img> avoids configuring remote image domains for one 32px picture.
              // eslint-disable-next-line @next/next/no-img-element
              <img src={profile.imageUrl} alt="" width={32} height={32} className="size-8 shrink-0 rounded-full border border-line" />
            ) : (
              <span aria-hidden="true" className="inline-flex size-8 shrink-0 items-center justify-center rounded-full bg-brand-soft font-mono text-label text-brand-fg">
                {profile.name.slice(0, 1).toUpperCase()}
              </span>
            )}
            <div className="flex min-w-0 flex-col">
              <span className="truncate text-body-sm font-medium text-fg">{profile.name}</span>
              {profile.email && <span className="truncate font-mono text-micro text-fg-faint">{profile.email}</span>}
            </div>
          </div>
          <div className="flex flex-col pb-[env(safe-area-inset-bottom,0px)]">
            <AccountButton className={row} />
            <SignOutButton className={row} />
          </div>
        </div>
      </div>
    </>
  );
}

/**
 * The console frame. Large screens: a full-height rail in the command bar's
 * material (`.admin-rail`). Below `lg`: the public command bar and drawer,
 * one-for-one. Rendered only after `requireAdmin()` succeeds.
 */
export function AdminShell({ profile, brandMark, children }: { profile: AdminProfile; brandMark: string; children: ReactNode }) {
  return (
    <div className="relative z-[1] flex min-h-svh flex-col lg:flex-row">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-[100] focus:rounded-md focus:bg-brand focus:px-4 focus:py-2 focus:text-on-brand"
      >
        Skip to content
      </a>

      <aside aria-label="Admin sidebar" className="admin-rail sticky top-0 hidden h-svh w-64 shrink-0 flex-col overflow-y-auto lg:flex">
        <div className="flex h-16 shrink-0 items-center border-b border-line px-2.5">
          <AdminIdentity brandMark={brandMark} />
        </div>
        <Panel profile={profile} placement="rail" />
      </aside>

      <AdminTopBar brand={<AdminIdentity brandMark={brandMark} />}>
        <Panel profile={profile} placement="drawer" />
      </AdminTopBar>

      <main id="main" tabIndex={-1} className="min-w-0 flex-1">
        <div className="mx-auto flex w-full max-w-[72rem] flex-col gap-8 px-gutter py-8 lg:px-10 lg:py-10">{children}</div>
      </main>
    </div>
  );
}
