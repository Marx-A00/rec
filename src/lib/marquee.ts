// src/lib/marquee.ts
// Server-side fetch for the landing-page marquee covers so they can be rendered
// in the initial HTML (no client fetch waterfall on first paint).

import { prisma } from '@/lib/prisma';
import type { MarqueeCover } from '@/components/landing/HeroMarquee';

export async function getMarqueeCovers(): Promise<MarqueeCover[]> {
  const entries = await prisma.marqueeAlbum.findMany({
    orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
    select: {
      album: {
        select: {
          id: true,
          title: true,
          coverArtUrl: true,
          cloudflareImageId: true,
          artists: {
            select: { artist: { select: { name: true } } },
          },
        },
      },
    },
  });

  return entries.map(entry => {
    const artist = entry.album.artists?.[0]?.artist?.name ?? 'Unknown';
    return {
      src: entry.album.coverArtUrl,
      cloudflareImageId: entry.album.cloudflareImageId,
      alt: `${artist} - ${entry.album.title}`,
      href: `/albums/${entry.album.id}`,
    };
  });
}
