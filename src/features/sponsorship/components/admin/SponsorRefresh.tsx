'use client';

import { useState, useTransition } from 'react';
import { buttonStyles } from '@/components/ui/button-styles';
import { refreshSponsors } from '../../mutations';

/** Between refreshes: one GitHub request each, so repeated clicks have nothing to gain. */
const COOLDOWN_MS = 15_000;

/**
 * Reads the sponsors from GitHub again instead of waiting for the half-hourly
 * refresh. The action expires the cache; the page then reloads its status.
 */
export function SponsorRefresh() {
  const [pending, start] = useTransition();
  const [cooling, setCooling] = useState(false);
  const [message, setMessage] = useState('');

  const run = () =>
    start(async () => {
      let ok = false;
      try {
        ok = (await refreshSponsors({})).ok;
      } catch {
        // Reported below.
      }
      setMessage(ok ? 'Refreshed from GitHub.' : 'The refresh didn’t work. Try again.');
      if (!ok) return;
      setCooling(true);
      setTimeout(() => setCooling(false), COOLDOWN_MS);
    });

  return (
    <div className="flex flex-wrap items-center gap-3">
      <button type="button" onClick={run} disabled={pending || cooling} className={buttonStyles({ variant: 'secondary', size: 'sm' })}>
        {pending ? 'Refreshing…' : 'Refresh from GitHub'}
      </button>
      <p role="status" className="text-body-sm text-fg-muted">
        {pending ? '' : message}
      </p>
    </div>
  );
}
