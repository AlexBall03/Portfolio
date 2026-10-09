'use client';

import { useSyncExternalStore } from 'react';
import { INTL_LOCALE } from '@/config/site';

const UNITS: [Intl.RelativeTimeFormatUnit, number][] = [
  ['year', 31_536_000],
  ['month', 2_592_000],
  ['week', 604_800],
  ['day', 86_400],
  ['hour', 3_600],
  ['minute', 60],
];

export function formatRelative(iso: string, now = Date.now()): string {
  const diff = (now - Date.parse(iso)) / 1000;
  const rtf = new Intl.RelativeTimeFormat(INTL_LOCALE, { numeric: 'auto' });
  for (const [unit, secs] of UNITS) {
    // Floor, not round: 23.5h is "23 hours ago", never "24 hours ago" ahead of "yesterday".
    if (diff >= secs) return rtf.format(-Math.floor(diff / secs), unit);
  }
  return rtf.format(0, 'minute');
}

const noop = () => () => {};

/**
 * "3 days ago", computed in the browser. The server (and a cached page)
 * renders the absolute date instead, so nothing stale is ever baked in.
 */
export function RelativeTime({ iso }: { iso: string }) {
  const text = useSyncExternalStore(
    noop,
    () => formatRelative(iso),
    () => new Intl.DateTimeFormat(INTL_LOCALE, { dateStyle: 'medium', timeZone: 'UTC' }).format(new Date(iso)),
  );
  return <time dateTime={iso}>{text}</time>;
}
