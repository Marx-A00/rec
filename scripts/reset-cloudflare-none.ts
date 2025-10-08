#!/usr/bin/env tsx
/**
 * Reset albums/artists with cloudflareImageId='none' back to null
 * This allows re-queueing after fixing Cloudflare credentials
 */

import { prisma } from '@/lib/prisma';

async function main() {
  console.log('🔄 Resetting failed Cloudflare image caches...\n');

  // Reset albums
  const albumsResult = await prisma.album.updateMany({
    where: { cloudflareImageId: 'none' },
    data: { cloudflareImageId: null },
  });

  console.log(`✅ Reset ${albumsResult.count} albums with cloudflareImageId='none' to null`);

  // Reset artists
  const artistsResult = await prisma.artist.updateMany({
    where: { cloudflareImageId: 'none' },
    data: { cloudflareImageId: null },
  });

  console.log(`✅ Reset ${artistsResult.count} artists with cloudflareImageId='none' to null`);

  console.log('\n✅ Done! You can now re-run the caching scripts.');

  await prisma.$disconnect();
}

main().catch((error) => {
  console.error('❌ Error:', error);
  process.exit(1);
});
