'use client';

import { useEffect, useState } from 'react';
import type { ProfileRole } from '../types';

/** The role list with one entry highlighted in turn (static under reduced motion). */
export function RoleCycler({ roles }: { roles: ProfileRole[] }) {
  const [lit, setLit] = useState(0);

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const t = setInterval(() => setLit((v) => (v + 1) % roles.length), 1900);
    return () => clearInterval(t);
  }, [roles.length]);

  return (
    <ul className="about-roles">
      {roles.map((r, i) => (
        <li key={r.label} className={`ar ${r.accent === 'gold' ? 'g' : ''} ${i === lit ? 'lit' : ''}`}>
          <span className="d" aria-hidden="true">
            ◆
          </span>{' '}
          {r.label}
        </li>
      ))}
    </ul>
  );
}
