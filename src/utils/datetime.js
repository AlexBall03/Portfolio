// Shared date/time formatting. Everything here leans on Intl so locale and
// time zone handling stay standards-based rather than hand-rolled.

// Formats the build stamp injected by vite.config.js into a readable date.
// Returns null on a malformed value so callers can skip rendering entirely
// instead of printing "Invalid Date".
export function formatBuildDate(iso, locale) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return new Intl.DateTimeFormat(locale, {
    year: 'numeric', month: 'long', day: 'numeric',
  }).format(d);
}

// Arizona does not observe DST, but hard-coding an offset would silently rot if
// that ever changed. The IANA zone lets Intl own that decision.
export const PHOENIX_TZ = 'America/Phoenix';

// Current wall-clock time in Phoenix, e.g. "6:42 PM MST" — hours and minutes
// only, no ticking seconds.
export function formatPhoenixTime(locale, date = new Date()) {
  return new Intl.DateTimeFormat(locale, {
    timeZone: PHOENIX_TZ,
    hour: 'numeric',
    minute: '2-digit',
    timeZoneName: 'short',
  }).format(date);
}
