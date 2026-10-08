'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Icon } from '@/components/ui/Icon';
import { activeAdminHref, ADMIN_NAV } from '@/config/admin';
import { cn } from '@/lib/cn';
import { adminGroupTitle, adminInset, type AdminPlacement, adminRow, stagger } from './styles';

/**
 * Console navigation: compact icon-led rows in titled groups. The current
 * page is a brand-tinted pill with the command bar's brand rule (turned
 * vertical) on its leading edge. Client only for `aria-current`.
 */
export function AdminNav({ placement }: { placement: AdminPlacement }) {
  const active = activeAdminHref(usePathname());
  const drawer = placement === 'drawer';
  let index = 0;

  return (
    <nav aria-label="Admin" className={cn('flex flex-col gap-4 py-3', adminInset[placement])}>
      {ADMIN_NAV.map((group, g) => {
        const titleIndex = index;
        return (
          <div key={group.label ?? g} className="flex flex-col gap-0.5">
            {group.label && (
              <p style={drawer ? stagger(1 + titleIndex) : undefined} className={cn(adminGroupTitle, 'pb-1.5', drawer && 'drawer-item')}>
                {group.label}
              </p>
            )}
            <ul className="flex flex-col gap-0.5">
              {group.items.map((item) => {
                const current = active === item.href;
                const i = index++;
                return (
                  <li key={item.href} style={drawer ? stagger(1 + i) : undefined} className={cn(drawer && 'drawer-item')}>
                    <Link
                      href={item.href}
                      aria-current={current ? 'page' : undefined}
                      className={cn(
                        'relative flex items-center rounded-md font-medium transition-colors [&_svg]:size-[18px] [&_svg]:shrink-0',
                        adminRow(placement),
                        'before:absolute before:inset-y-2 before:-left-px before:w-0.5 before:rounded-full before:bg-brand before:transition-opacity',
                        current
                          ? 'bg-brand-soft text-fg before:opacity-100 [&_svg]:text-accent-fg'
                          : 'text-fg-muted before:opacity-0 hover:bg-fg/[0.05] hover:text-fg [&_svg]:text-fg-faint hover:[&_svg]:text-fg-muted',
                      )}
                    >
                      <Icon name={item.icon} />
                      <span className="truncate">{item.label}</span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        );
      })}
    </nav>
  );
}
