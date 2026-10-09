'use client';

import { useEffect, useState } from 'react';
import { INTL_LOCALE } from '@/config/site';

function format(timeZone: string) {
  return new Intl.DateTimeFormat(INTL_LOCALE, {
    timeZone,
    hour: 'numeric',
    minute: '2-digit',
    timeZoneName: 'short',
  }).format(new Date());
}

interface LocalTimeProps {
  timeZone: string;
  className?: string;
}

/**
 * Live wall-clock time in the owner's time zone. Empty in server HTML (a
 * prerendered time would be stale), then ticks on the minute in the browser.
 */
export function LocalTime({ timeZone, className }: LocalTimeProps) {
  const [time, setTime] = useState<string | null>(null);

  useEffect(() => {
    let interval = 0;
    const tick = () => setTime(format(timeZone));
    const first = window.setTimeout(tick, 0);
    // Align updates with the wall-clock minute instead of page-load time.
    const aligned = window.setTimeout(() => {
      tick();
      interval = window.setInterval(tick, 60_000);
    }, 60_000 - (Date.now() % 60_000));
    // Background tabs throttle timers; resync when the tab is visible again.
    const onVisible = () => {
      if (!document.hidden) tick();
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      clearTimeout(first);
      clearTimeout(aligned);
      clearInterval(interval);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [timeZone]);

  return <span className={className}>{time}</span>;
}
