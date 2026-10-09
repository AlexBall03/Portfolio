import { isLocale } from '@/i18n/config';
import { parseShareCard } from '@/lib/seo/share-card/card';
import { renderShareCard } from '@/lib/seo/share-card/render';

interface ShareCardRouteProps {
  params: Promise<{ locale: string; card: string[] }>;
}

/**
 * Generated share cards: /og/en/home.png, /og/es/about.png,
 * /og/en/projects/<slug>.png. `pageMetadata` points every page's Open Graph
 * and Twitter image here; the extension keeps these URLs out of the locale
 * proxy. Rendering is cached by tag (render.tsx), so admin edits show up on the
 * next request after the short CDN lifetime below.
 */
export async function GET(_request: Request, { params }: ShareCardRouteProps) {
  const { locale, card: segments } = await params;
  const card = parseShareCard(segments);
  const png = isLocale(locale) && card ? await renderShareCard(locale, card) : null;
  if (!png) {
    return new Response('Not found', { status: 404, headers: { 'Cache-Control': 'public, max-age=0, s-maxage=60' } });
  }
  return new Response(png as Uint8Array<ArrayBuffer>, {
    headers: {
      'Content-Type': 'image/png',
      'Cache-Control': 'public, max-age=0, s-maxage=300, stale-while-revalidate=60',
    },
  });
}
