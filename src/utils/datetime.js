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
