import { revalidateTag } from 'next/cache';
import { resumeUploadMetaInput } from '@/features/resume/schema';
import * as service from '@/features/resume/service';
import { CACHE_TAGS } from '@/lib/cache-tags';
import { runMutation } from '@/lib/cms/mutation';
import { readUpload, respond } from '@/lib/cms/upload';
import { MAX_PDF_BYTES } from '@/lib/pdf-file';
import { adminRoute } from '@/server/auth/route';

/**
 * Uploads a resume version (multipart: `file`, `label`). A Route Handler
 * rather than a Server Action: PDFs exceed the action body limit. The
 * service checks the bytes and chooses the private storage path. A new
 * version is never published by uploading.
 */
export const POST = adminRoute(async (request, _context: unknown, admin) => {
  const upload = await readUpload(request, { maxBytes: MAX_PDF_BYTES, noun: 'PDF', tooLarge: 'PDFs can be at most 4 MB' });
  if ('error' in upload) return upload.error;
  const label = upload.form.get('label');
  const fileName = upload.file instanceof File ? upload.file.name : null;
  const result = await runMutation(resumeUploadMetaInput, { label: typeof label === 'string' ? label : '' }, async (meta) => {
    const saved = await service.uploadResume({ bytes: upload.bytes, fileName, ...meta }, admin);
    // Uploads don't change public output (nothing is published); expire anyway so reads never lag the table.
    revalidateTag(CACHE_TAGS.resume, { expire: 0 });
    return saved;
  });
  return respond(result);
});
