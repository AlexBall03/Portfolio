import { connection } from 'next/server';
import { openPublishedResume, pdfResponse } from '@/features/resume/delivery';

/**
 * The public resume: `/resume.pdf` serves the published version and nothing
 * else (there is no way to name another version here), or 404 when none is
 * published. Pages link it as `/resume.pdf?v=<id>`, so a newly published
 * version is never served from a stale CDN entry; the bare URL is stable for
 * sharing and refreshes within the CDN lifetime below.
 */
export async function GET() {
  await connection();
  const opened = await openPublishedResume();
  if (!opened) {
    return new Response('Not found', { status: 404, headers: { 'Cache-Control': 'public, max-age=0, s-maxage=60' } });
  }
  return pdfResponse(opened, {
    disposition: 'inline',
    cacheControl: 'public, max-age=0, s-maxage=300, stale-while-revalidate=60',
  });
}
