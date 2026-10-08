import { revalidateTag } from 'next/cache';
import { z } from 'zod';
import * as service from '@/features/projects/service';
import { readUpload, respond, uuidParam } from '@/features/projects/upload';
import { CACHE_TAGS } from '@/lib/cache-tags';
import { runMutation } from '@/lib/cms/mutation';
import { adminRoute, notFoundResponse } from '@/server/auth/route';

type Context = { params: Promise<{ id: string; assetId: string }> };

/** Replaces one project image's file (multipart `file`); its text, position, and hero choice are kept. */
export const PUT = adminRoute(async (request, { params }: Context, admin) => {
  const { id, assetId } = await params;
  if (!uuidParam.safeParse(id).success || !uuidParam.safeParse(assetId).success) return notFoundResponse();
  const upload = await readUpload(request);
  if ('error' in upload) return upload.error;
  const result = await runMutation(z.object({}), {}, async () => {
    const saved = await service.replaceProjectImage({ projectId: id, assetId, bytes: upload.bytes }, admin);
    revalidateTag(CACHE_TAGS.projects, { expire: 0 });
    return saved;
  });
  return respond(result);
});
