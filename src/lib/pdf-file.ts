/**
 * PDF checks for resume uploads. Like `image-file.ts`, the type comes from the
 * file's own bytes, never from the client's file name or declared MIME type.
 */

export const PDF_MIME_TYPE = 'application/pdf';

/** Kept under Vercel's 4.5 MB function request body limit (multipart overhead included). */
export const MAX_PDF_BYTES = 4 * 1024 * 1024;

const HEADER = '%PDF-';
const TRAILER = '%%EOF';

const indexOf = (bytes: Uint8Array, text: string, from: number, to: number) => {
  const codes = [...text].map((c) => c.charCodeAt(0));
  for (let i = Math.max(0, from); i <= Math.min(bytes.length, to) - codes.length; i++) {
    if (codes.every((c, j) => bytes[i + j] === c)) return i;
  }
  return -1;
};

/**
 * A complete PDF: the `%PDF-` header within the first kilobyte (the spec lets
 * a little junk precede it) and an `%%EOF` marker near the end, so a renamed
 * file or a truncated upload is rejected.
 */
export function isPdf(bytes: Uint8Array): boolean {
  if (bytes.length < 64) return false;
  return indexOf(bytes, HEADER, 0, 1024) !== -1 && indexOf(bytes, TRAILER, bytes.length - 2048, bytes.length) !== -1;
}

/**
 * The client's file name, reduced to something safe to show and to put in a
 * `Content-Disposition` header: ASCII letters, digits, `.`, `-`, `_`, ending in `.pdf`.
 */
export function safePdfFileName(name: string | null | undefined, fallback = 'resume.pdf'): string {
  const base = (name ?? '')
    .split(/[\\/]/)
    .pop()!
    .replace(/\.pdf$/i, '')
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '') // accents: "Résumé" → "Resume"
    .replace(/[^\w.-]+/g, '-')
    .replace(/-+/g, '-')
    .slice(0, 100)
    .replace(/^[-.]+|[-.]+$/g, '');
  return base ? `${base}.pdf` : fallback;
}
