/** Byte fixtures for image upload tests: real headers, no pixel data needed. */

export const toBytes = (...parts: (number[] | string)[]) =>
  new Uint8Array(parts.flatMap((p) => (typeof p === 'string' ? [...p].map((c) => c.charCodeAt(0)) : p)));
export const u32be = (n: number) => [(n >>> 24) & 255, (n >>> 16) & 255, (n >>> 8) & 255, n & 255];
export const u16be = (n: number) => [(n >>> 8) & 255, n & 255];

/** A PNG signature and IHDR chunk for a `width`×`height` image. */
export const pngBytes = (width: number, height: number) =>
  toBytes('\x89PNG\r\n\x1a\n', u32be(13), 'IHDR', u32be(width), u32be(height), [8, 6, 0, 0, 0]);
