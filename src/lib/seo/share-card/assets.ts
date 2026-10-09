import 'server-only';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { createLogger } from '@/lib/logger';
import { sniffImage } from '@/lib/image-file';
import type { MediaAsset } from '@/lib/media';

type FontWeight = 400 | 500 | 600;
export interface CardFont {
  name: string;
  data: ArrayBuffer;
  weight: FontWeight;
  style: 'normal';
}

/** Static TTF instances (OFL, src/assets/fonts): the renderer reads neither WOFF2 nor variable fonts. */
const FONT_FILES: readonly [name: string, file: string, weight: FontWeight][] = [
  ['Space Grotesk', 'SpaceGrotesk-Medium.ttf', 500],
  ['Space Grotesk', 'SpaceGrotesk-SemiBold.ttf', 600],
  ['Inter', 'Inter-Regular.ttf', 400],
  ['Inter', 'Inter-Medium.ttf', 500],
  ['JetBrains Mono', 'JetBrainsMono-Medium.ttf', 500],
];

let fonts: Promise<CardFont[]> | undefined;

export function loadFonts(): Promise<CardFont[]> {
  fonts ??= Promise.all(
    FONT_FILES.map(async ([name, file, weight]) => {
      const buf = await readFile(join(process.cwd(), 'src/assets/fonts', file));
      const data = buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength) as ArrayBuffer;
      return { name, data, weight, style: 'normal' as const };
    }),
  );
  return fonts;
}

const log = createLogger('share-card');
const MAX_BYTES = 8 * 1024 * 1024;

/**
 * An image as a data URL the renderer can embed, or null. Static assets are
 * read from /public; uploaded and external ones are fetched. Only PNG and
 * JPEG (sniffed from the bytes): the renderer can't decode WebP or AVIF, so
 * those fall back to the card's designed placeholder instead of failing it.
 */
export async function loadImage(asset: MediaAsset | null): Promise<string | null> {
  if (!asset) return null;
  try {
    let bytes: Uint8Array;
    if (/^https?:\/\//.test(asset.src)) {
      const res = await fetch(asset.src, { signal: AbortSignal.timeout(5000) });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      bytes = new Uint8Array(await res.arrayBuffer());
    } else {
      const relative = asset.src.replace(/^\/+/, '');
      if (relative.split('/').includes('..')) return null;
      bytes = new Uint8Array(await readFile(join(process.cwd(), 'public', relative)));
    }
    if (bytes.byteLength > MAX_BYTES) return null;
    const type = sniffImage(bytes)?.mimeType;
    if (type !== 'image/png' && type !== 'image/jpeg') return null;
    return `data:${type};base64,${Buffer.from(bytes).toString('base64')}`;
  } catch (error) {
    log.warn('Image could not be loaded', { src: asset.src, error: String(error) });
    return null;
  }
}
