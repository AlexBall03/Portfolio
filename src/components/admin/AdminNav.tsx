'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Icon } from '@/components/ui/Icon';
import { activeAdminHref, ADMIN_NAV } from '@/config/admin';
import { cn } from '@/lib/cn';
import { adminGroupTitle, adminInset, type AdminPlacement, stagger } from './styles';

/**
 * Console navigation in the public drawer's language: hairline rows, a brass
 * index, the display face, and the command bar's brand rule (turned
 * vertical) on the current page. Client only for `aria-current`.
 */
export function AdminNav({ placement }: { placement: AdminPlacement }) {
  const active = activeAdminHref(usePathname());
  const drawer = placement === 'drawer';
  let index = 0;

  return (
    <nav aria-label="Admin" className="flex flex-col">
      {ADMIN_NAV.map((group, g) => (
        <div key={group.label ?? g} className="flex flex-col">
          {group.label && <p className={cn(adminGroupTitle, adminInset[placement], 'pt-6 pb-2')}>{group.label}</p>}
          <ul className="flex flex-col">
            {group.items.map((item) => {
              const current = active === item.href;
              const i = index++;
              return (
                <li
                  key={item.href}
                  style={drawer ? stagger(1 + i) : undefined}
                  className={cn('border-b border-line', drawer && 'drawer-item')}
                >
                  <Link
                    href={item.href}
                    aria-current={current ? 'page' : undefined}
                    className={cn(
                      'relative flex items-center gap-4 transition-colors',
                      adminInset[placement],
                      drawer ? 'py-4' : 'py-3.5',
                      'before:absolute before:inset-y-3 before:left-0 before:w-0.5 before:rounded-full before:bg-brand before:transition-opacity',
                      current ? 'text-fg before:opacity-100' : 'text-fg-muted before:opacity-0 hover:bg-fg/[0.04] hover:text-fg',
                    )}
                  >
                    <span className="w-5 font-mono text-micro text-accent-fg">{String(i + 1).padStart(2, '0')}</span>
                    <span className={cn('font-display font-medium', drawer ? 'text-h3' : 'text-body')}>{item.label}</span>
                    <Icon
                      name="arrowRight"
                      className={cn('ml-auto size-4 transition-opacity', current ? 'text-brand-fg opacity-100' : 'opacity-0')}
                    />
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </nav>
  );
}
