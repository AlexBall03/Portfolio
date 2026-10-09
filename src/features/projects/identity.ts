/** Stable hue per project (blue → indigo → teal range) so each identity is distinct but on-brand. */
export function hueFor(slug: string): number {
  let h = 0;
  for (const ch of slug) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return 200 + (h % 80);
}
