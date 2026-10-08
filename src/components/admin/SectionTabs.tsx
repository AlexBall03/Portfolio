import Link from 'next/link';
import { cn } from '@/lib/cn';

export interface SectionTab<K extends string = string> {
  key: K;
  label: string;
  href: string;
}

/** Sub-navigation between the editors of one section (each is its own form and save). */
export function SectionTabs<K extends string>({
  label,
  tabs,
  current,
}: {
  label: string;
  tabs: readonly SectionTab<K>[];
  current: K;
}) {
  return (
    <nav aria-label={label} className="-mt-2 overflow-x-auto">
      <ul className="flex gap-1">
        {tabs.map((tab) => {
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
