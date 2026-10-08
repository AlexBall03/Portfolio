import { revalidateTag } from 'next/cache';
import { uploadMetaInput } from '@/features/projects/schema';
import * as service from '@/features/projects/service';
import { readUpload, respond, uploadMeta, uuidParam } from '@/features/projects/upload';
import { CACHE_TAGS } from '@/lib/cache-tags';
import { runMutation } from '@/lib/cms/mutation';
import { adminRoute, notFoundResponse } from '@/server/auth/route';

type Context = { params: Promise<{ id: string }> };

/**
 * Uploads a project image (multipart: `file`, `alt.<locale>`, `caption.<locale>`).
 * A Route Handler rather than a Server Action: images exceed the action body
 * limit. The service checks the bytes and chooses the storage path; the new
 * image is live immediately if the project is, so public reads are expired.
 */
export const POST = adminRoute(async (request, { params }: Context, admin) => {
  const { id } = await params;
  if (!uuidParam.safeParse(id).success) return notFoundResponse();
  const upload = await readUpload(request);
  if ('error' in upload) return upload.error;
  const result = await runMutation(uploadMetaInput, uploadMeta(upload.form), async (meta) => {
    const saved = await service.uploadProjectImage({ projectId: id, bytes: upload.bytes, ...meta }, admin);
    revalidateTag(CACHE_TAGS.projects, { expire: 0 });
    return saved;
  });
  return respond(result);
});
