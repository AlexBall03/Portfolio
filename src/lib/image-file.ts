/**
 * Image file checks for uploads. The type comes from the file's own bytes
 * (magic numbers), never from the client's file name or declared MIME type,
 * so a renamed executable or HTML file is rejected whatever it claims to be.
 */

export const IMAGE_TYPES = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/avif': 'avif',
} as const;

export type ImageMimeType = keyof typeof IMAGE_TYPES;

/** Kept under Vercel's 4.5 MB function request body limit (multipart overhead included). */
export const MAX_IMAGE_BYTES = 4 * 1024 * 1024;

export interface SniffedImage {
  mimeType: ImageMimeType;
  ext: (typeof IMAGE_TYPES)[ImageMimeType];
  /** Null when the format's header isn't parsed (AVIF) or is malformed. */
  width: number | null;
  height: number | null;
}

const ascii = (bytes: Uint8Array, at: number, text: string) =>
  [...text].every((ch, i) => bytes[at + i] === ch.charCodeAt(0));

function detect(bytes: Uint8Array): ImageMimeType | null {
  if (bytes.length < 12) return null;
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return 'image/jpeg';
  if (ascii(bytes, 0, '\x89PNG\r\n\x1a\n')) return 'image/png';
  if (ascii(bytes, 0, 'RIFF') && ascii(bytes, 8, 'WEBP')) return 'image/webp';
  if (ascii(bytes, 4, 'ftyp') && (ascii(bytes, 8, 'avif') || ascii(bytes, 8, 'avis'))) return 'image/avif';
  return null;
}

const positive = (w: number, h: number) => (w > 0 && h > 0 ? { width: w, height: h } : null);

function pngSize(b: Uint8Array, view: DataView) {
  return b.length >= 24 && ascii(b, 12, 'IHDR') ? positive(view.getUint32(16), view.getUint32(20)) : null;
}

function webpSize(b: Uint8Array, view: DataView) {
  if (b.length < 30) return null;
  if (ascii(b, 12, 'VP8X')) {
    const w = 1 + (b[24]! | (b[25]! << 8) | (b[26]! << 16));
    const h = 1 + (b[27]! | (b[28]! << 8) | (b[29]! << 16));
    return positive(w, h);
  }
  if (ascii(b, 12, 'VP8L')) {
    const bits = view.getUint32(21, true);
    return positive((bits & 0x3fff) + 1, ((bits >> 14) & 0x3fff) + 1);
  }
  if (ascii(b, 12, 'VP8 ')) return positive(view.getUint16(26, true) & 0x3fff, view.getUint16(28, true) & 0x3fff);
  return null;
}

/** Walks JPEG segments to the first start-of-frame marker. */
function jpegSize(b: Uint8Array, view: DataView) {
  let i = 2;
  while (i + 9 < b.length) {
    if (b[i] !== 0xff) return null;
    const marker = b[i + 1]!;
    if (marker === 0xff) {
      i++;
      continue;
    }
    const length = view.getUint16(i + 2);
    const isFrame = marker >= 0xc0 && marker <= 0xcf && marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc;
    if (isFrame) return positive(view.getUint16(i + 7), view.getUint16(i + 5));
    if (length < 2) return null;
    i += 2 + length;
  }
  return null;
}

/** Identifies a supported image from its bytes; null for anything else. */
export function sniffImage(bytes: Uint8Array): SniffedImage | null {
  const mimeType = detect(bytes);
  if (!mimeType) return null;
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  let size: { width: number; height: number } | null = null;
  try {
    if (mimeType === 'image/png') size = pngSize(bytes, view);
    else if (mimeType === 'image/webp') size = webpSize(bytes, view);
    else if (mimeType === 'image/jpeg') size = jpegSize(bytes, view);
  } catch {
    size = null; // Truncated header: the type is still known.
  }
  return { mimeType, ext: IMAGE_TYPES[mimeType], width: size?.width ?? null, height: size?.height ?? null };
}
