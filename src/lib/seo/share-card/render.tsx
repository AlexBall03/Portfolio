import 'server-only';
import { cacheLife, cacheTag } from 'next/cache';
import { ImageResponse } from 'next/og';
import { SHARE_CARD_SIZE } from '@/config/site';
import { CACHE_LIFE } from '@/lib/cache-tags';
import { loadFonts, loadImage } from './assets';
import type { ShareCard } from './card';
import { HomeCard, PageCard, ProjectCard } from './cards';
import { cardInputs, SHARE_CARD_TAGS } from './inputs';

/**
 * A share card as PNG bytes, or null when the card names nothing (unknown
 * project). Cached with the tags of everything it reads, so an admin save
 * refreshes the cards exactly as it refreshes the pages. Content comes from
 * `cardInputs`, the same source as the page's `?v=` version.
 */
export async function renderShareCard(card: ShareCard): Promise<Uint8Array | null> {
  'use cache';
  cacheLife(CACHE_LIFE.content);
  cacheTag(...SHARE_CARD_TAGS);

  const spec = await cardInputs(card);
  if (!spec) return null;
  const image = await loadImage(spec.image);
  const element =
    spec.kind === 'project' ? (
      <ProjectCard {...spec.props} cover={image} />
    ) : spec.kind === 'home' ? (
      <HomeCard {...spec.props} headshot={image} />
    ) : (
      <PageCard {...spec.props} headshot={image} />
    );
  const response = new ImageResponse(element, { ...SHARE_CARD_SIZE, fonts: await loadFonts() });
  return new Uint8Array(await response.arrayBuffer());
}
