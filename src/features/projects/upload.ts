import 'server-only';
import { z } from 'zod';

import { readUpload as readFileUpload } from '@/lib/cms/upload';
import { MAX_IMAGE_BYTES } from '@/lib/image-file';

/**
 * Project-image specifics of the upload Route Handlers; the generic request
 * plumbing is `lib/cms/upload.ts`. The rules themselves (what is an image,
 * where it is stored) live in the service.
 */

export { respond } from '@/lib/cms/upload';

export const uuidParam = z.uuid();

export const readUpload = (request: Request) =>
  readFileUpload(request, { maxBytes: MAX_IMAGE_BYTES, noun: 'image', tooLarge: 'Images can be at most 4 MB' });

/** The `alt` and `caption` form fields, for `uploadMetaInput`. */
export function uploadMeta(form: FormData) {
  const field = (name: string) => {
    const value = form.get(name);
    return typeof value === 'string' ? value : '';
  };
  return { alt: field('alt'), caption: field('caption') };
}
