'use client';

import { useEffect, useState } from 'react';
import { cn } from '@/lib/cn';
import type { ProfileRole } from '../types';

/** The role list with one entry highlighted in turn (static under reduced motion). */
export function RoleCycler({ roles }: { roles: ProfileRole[] }) {
  const [lit, setLit] = useState(0);

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const t = setInterval(() => setLit((v) => (v + 1) % roles.length), 2200);
    return () => clearInterval(t);
  }, [roles.length]);

  return (
    <ul className="flex flex-col gap-1">
      {roles.map((r, i) => (
        <li
          key={r.label}
          className={cn(
            'flex items-center gap-3 font-display text-h2 font-semibold transition-colors duration-500',
            i === lit ? 'text-fg' : 'text-fg-faint',
          )}
        >
          <span
            aria-hidden="true"
            className={cn(
              'size-1.5 shrink-0 rounded-full transition-opacity duration-500',
              r.accent === 'gold' ? 'bg-accent' : 'bg-brand',
              i === lit ? 'opacity-100' : 'opacity-0',
            )}
          />
          {r.label}
        </li>
      ))}
    </ul>
  );
}
