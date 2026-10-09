import { revalidateTag } from 'next/cache';
import { headshotTextInput } from '@/features/profile/schema';
import * as service from '@/features/profile/service';
import { LOCALES } from '@/i18n/config';
import { CACHE_TAGS } from '@/lib/cache-tags';
import { runMutation } from '@/lib/cms/mutation';
import { readUpload, respond } from '@/lib/cms/upload';
import { MAX_IMAGE_BYTES } from '@/lib/image-file';
import { adminRoute } from '@/server/auth/route';

/**
 * Uploads a new headshot (multipart: `file`, `alt.<locale>`), replacing the
 * current one. A Route Handler rather than a Server Action: images exceed the
 * action body limit. The service checks the bytes and chooses the storage
 * path; the photo is live immediately, so public reads (pages and share
 * cards) are expired.
 */
export const POST = adminRoute(async (request, _context, admin) => {
  const upload = await readUpload(request, { maxBytes: MAX_IMAGE_BYTES, noun: 'image', tooLarge: 'Images can be at most 4 MB' });
  if ('error' in upload) return upload.error;
  const field = (name: string) => {
    const value = upload.form.get(name);
    return typeof value === 'string' ? value : '';
  };
  const meta = { translations: Object.fromEntries(LOCALES.map((l) => [l, { alt: field(`alt.${l}`) }])) };
  const result = await runMutation(headshotTextInput, meta, async (data) => {
    const saved = await service.uploadHeadshot({ bytes: upload.bytes, ...data }, admin);
    revalidateTag(CACHE_TAGS.profile, { expire: 0 });
    return saved;
  });
  return respond(result);
});
