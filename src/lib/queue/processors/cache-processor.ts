// src/lib/queue/processors/cache-processor.ts
// Cloudflare image caching handlers

import { prisma } from '@/lib/prisma';

import type {
  CacheAlbumCoverArtJobData,
  CacheArtistImageJobData,
} from '../jobs';

// ============================================================================
// Cover Art Caching Handler
// ============================================================================

export async function handleCacheAlbumCoverArt(
  data: CacheAlbumCoverArtJobData
): Promise<any> {
  const { albumId } = data;

  try {
    // Fetch album from database
    const album = await prisma.album.findUnique({
      where: { id: albumId },
      select: {
        id: true,
        title: true,
        coverArtUrl: true,
        cloudflareImageId: true,
      },
    });

    if (!album) {
      // Non-retryable error: album doesn't exist
      throw new Error(`Album ${albumId} not found`);
    }

    // Skip if already cached
    if (album.cloudflareImageId && album.cloudflareImageId !== 'none') {
      return {
        success: true,
        cached: true,
        albumId,
        cloudflareImageId: album.cloudflareImageId,
        message: 'Already cached',
      };
    }

    // Skip if no cover art URL (mark as 'none')
    if (!album.coverArtUrl) {
      await prisma.album.update({
        where: { id: albumId },
        data: { cloudflareImageId: 'none' },
      });

      return {
        success: true, // Don't retry - this is expected
        cached: false,
        albumId,
        cloudflareImageId: 'none',
        message: 'No cover art URL available',
      };
    }

    // Import cacheAlbumArt lazily to avoid circular dependencies
    const { cacheAlbumArt } = await import('@/lib/cloudflare-images');

    // Upload to Cloudflare
    const result = await cacheAlbumArt(
      album.coverArtUrl,
      album.id,
      album.title
    );

    if (!result) {
      // Check if it's a 404 (non-retryable) or transient error (retryable)
      // For now, mark as 'none' and don't retry
      await prisma.album.update({
        where: { id: albumId },
        data: { cloudflareImageId: 'none' },
      });

      return {
        success: true, // Don't retry - mark as processed
        cached: false,
        albumId,
        cloudflareImageId: 'none',
        message: 'Failed to fetch image from source (404 or invalid URL)',
      };
    }

    // Update database with Cloudflare image ID
    await prisma.album.update({
      where: { id: albumId },
      data: { cloudflareImageId: result.id },
    });

    console.log(`✅ Cached cover art for "${album.title}" (${albumId})`);

    return {
      success: true,
      cached: false,
      albumId,
      cloudflareImageId: result.id,
      cloudflareUrl: result.url,
      message: 'Successfully cached',
    };
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : 'Unknown error';
    console.error(
      `❌ Error caching cover art for album ${albumId}:`,
      errorMessage
    );

    // Throw to trigger BullMQ retry with exponential backoff
    throw new Error(`Failed to cache album ${albumId}: ${errorMessage}`);
  }
}

// ============================================================================
// Artist Image Caching Handler
// ============================================================================

/**
 * Handle CACHE_ARTIST_IMAGE job
 * Caches artist images from external sources to Cloudflare Images CDN
 */
export async function handleCacheArtistImage(
  data: CacheArtistImageJobData
): Promise<any> {
  const { artistId } = data;

  try {
    // Fetch artist from database
    const artist = await prisma.artist.findUnique({
      where: { id: artistId },
      select: {
        id: true,
        name: true,
        imageUrl: true,
        cloudflareImageId: true,
      },
    });

    if (!artist) {
      // Non-retryable error: artist doesn't exist
      throw new Error(`Artist ${artistId} not found`);
    }

    // Skip if already cached
    if (artist.cloudflareImageId && artist.cloudflareImageId !== 'none') {
      return {
        success: true,
        cached: true,
        artistId,
        cloudflareImageId: artist.cloudflareImageId,
        message: 'Already cached',
      };
    }

    // Skip if no image URL (mark as 'none')
    if (!artist.imageUrl) {
      await prisma.artist.update({
        where: { id: artistId },
        data: { cloudflareImageId: 'none' },
      });

      return {
        success: true, // Don't retry - this is expected
        cached: false,
        artistId,
        cloudflareImageId: 'none',
        message: 'No image URL available',
      };
    }

    // Import cacheArtistImage lazily to avoid circular dependencies
    const { cacheArtistImage } = await import('@/lib/cloudflare-images');

    // Upload to Cloudflare
    const result = await cacheArtistImage(
      artist.imageUrl,
      artist.id,
      artist.name
    );

    if (!result) {
      // Check if it's a 404 (non-retryable) or transient error (retryable)
      // For now, mark as 'none' and don't retry
      await prisma.artist.update({
        where: { id: artistId },
        data: { cloudflareImageId: 'none' },
      });

      return {
        success: true, // Don't retry - mark as processed
        cached: false,
        artistId,
        cloudflareImageId: 'none',
        message: 'Failed to fetch image from source (404 or invalid URL)',
      };
    }

    // Update database with Cloudflare image ID
    await prisma.artist.update({
      where: { id: artistId },
      data: { cloudflareImageId: result.id },
    });

    console.log(`✅ Cached image for "${artist.name}" (${artistId})`);

    return {
      success: true,
      cached: false,
      artistId,
      cloudflareImageId: result.id,
      cloudflareUrl: result.url,
      message: 'Successfully cached',
    };
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : 'Unknown error';
    console.error(
      `❌ Error caching image for artist ${artistId}:`,
      errorMessage
    );

    // Throw to trigger BullMQ retry with exponential backoff
    throw new Error(`Failed to cache artist ${artistId}: ${errorMessage}`);
  }
}
