import 'server-only';
import { z } from 'zod';
import { LOCALES } from '@/i18n/config';
import type { MutationResult } from '@/lib/cms/result';
import { MAX_IMAGE_BYTES } from '@/lib/image-file';

/**
 * HTTP plumbing for the media upload Route Handlers: request parsing, size
 * limits, and the response shape (a `MutationResult`, like the Server
 * Actions, so the editor handles both the same way). The rules themselves
 * (what is an image, where it is stored) live in the service.
 */

export const uuidParam = z.uuid();

/** Multipart overhead allowance on top of the file itself. */
const MAX_BODY_BYTES = MAX_IMAGE_BYTES + 64 * 1024;

export const respond = <T,>(body: MutationResult<T>) => Response.json(body, { status: body.ok ? 200 : 422 });

export const failure = (fieldErrors: Record<string, string>, formError: string, status = 422) =>
  Response.json({ ok: false, fieldErrors, formError } satisfies MutationResult<never>, { status });

const TOO_LARGE = () => failure({ file: 'Images can be at most 4 MB' }, 'The image is too large.', 413);

/**
 * Reads the multipart body. Oversized requests are refused before the body is
 * read; the file's client-side name and MIME type are never used.
 */
export async function readUpload(
  request: Request,
): Promise<{ form: FormData; bytes: Uint8Array } | { error: Response }> {
  const length = Number(request.headers.get('content-length') ?? 0);
  if (length > MAX_BODY_BYTES) return { error: TOO_LARGE() };
  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return { error: failure({ file: 'Choose an image to upload' }, 'The upload could not be read.', 400) };
  }
  const file = form.get('file');
  if (!(file instanceof Blob)) return { error: failure({ file: 'Choose an image to upload' }, 'No image was sent.', 400) };
  if (file.size > MAX_IMAGE_BYTES) return { error: TOO_LARGE() };
  return { form, bytes: new Uint8Array(await file.arrayBuffer()) };
}

/** `alt.en`, `caption.es`, … → `{ translations: { en: { alt, caption } } }` for `uploadMetaInput`. */
export function uploadMeta(form: FormData) {
  const field = (name: string) => {
    const value = form.get(name);
    return typeof value === 'string' ? value : '';
  };
  return {
    translations: Object.fromEntries(LOCALES.map((l) => [l, { alt: field(`alt.${l}`), caption: field(`caption.${l}`) }])),
  };
}
