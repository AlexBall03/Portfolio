import { z } from 'zod';
import { openResumeVersion, pdfResponse } from '@/features/resume/delivery';
import { adminRoute, notFoundResponse } from '@/server/auth/route';

type Context = { params: Promise<{ id: string }> };

/**
 * Any resume version, published or not, for the admin only (preview inline,
 * or `?download=1` as an attachment). Unknown, deleted, or unreadable
 * versions get the same 404 as an unauthorized caller.
 */
export const GET = adminRoute(async (request, { params }: Context) => {
  const { id } = await params;
  if (!z.uuid().safeParse(id).success) return notFoundResponse();
  const opened = await openResumeVersion(id);
  if (!opened) return notFoundResponse();
  const download = new URL(request.url).searchParams.get('download') === '1';
  // `adminRoute` replaces Cache-Control with `private, no-store`.
  return pdfResponse(opened, { disposition: download ? 'attachment' : 'inline', cacheControl: 'private, no-store' });
});
