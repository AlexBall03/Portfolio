import 'server-only';
import type { MutationResult } from './result';

/**
 * HTTP plumbing shared by the admin upload Route Handlers: request parsing,
 * size limits, and the response shape (a `MutationResult`, like the Server
 * Actions, so editors handle both the same way). What a file *is* and where
 * it is stored are decided by each domain service.
 */

/** Multipart overhead allowance on top of the file itself. */
const MULTIPART_OVERHEAD = 64 * 1024;

export const respond = <T,>(body: MutationResult<T>) => Response.json(body, { status: body.ok ? 200 : 422 });

export const failure = (fieldErrors: Record<string, string>, formError: string, status = 422) =>
  Response.json({ ok: false, fieldErrors, formError } satisfies MutationResult<never>, { status });

export interface UploadLimits {
  maxBytes: number;
  /** "image", "PDF": used in the error messages. */
  noun: string;
  /** The field error for an oversized file, e.g. "Images can be at most 4 MB". */
  tooLarge: string;
}

/**
 * Reads a multipart body with one `file`. Oversized requests are refused
 * before the body is read; the file's client-side MIME type is never used.
 */
export async function readUpload(
  request: Request,
  limits: UploadLimits,
): Promise<{ form: FormData; file: Blob; bytes: Uint8Array } | { error: Response }> {
  const tooLarge = () =>
    failure({ file: limits.tooLarge }, `The ${limits.noun} is too large.`, 413);
  const choose = `Choose ${/^[aeiou]/i.test(limits.noun) ? 'an' : 'a'} ${limits.noun} to upload`;
  const length = Number(request.headers.get('content-length') ?? 0);
  if (length > limits.maxBytes + MULTIPART_OVERHEAD) return { error: tooLarge() };
  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return { error: failure({ file: choose }, 'The upload could not be read.', 400) };
  }
  const file = form.get('file');
  if (!(file instanceof Blob)) return { error: failure({ file: choose }, `No ${limits.noun} was sent.`, 400) };
  if (file.size > limits.maxBytes) return { error: tooLarge() };
  return { form, file, bytes: new Uint8Array(await file.arrayBuffer()) };
}
