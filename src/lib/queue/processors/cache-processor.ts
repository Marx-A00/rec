// src/lib/queue/processors/cache-processor.ts
// Cloudflare image caching handlers

import { Job } from 'bullmq';

import { prisma } from '@/lib/prisma';

import { createLlamaLogger } from '@/lib/logging/llama-logger';
import type {
  CacheAlbumCoverArtJobData,
  CacheArtistImageJobData,
} from '../jobs';
import { JOB_TYPES } from '../jobs';

// ============================================================================
// Cover Art Caching Handler
// ============================================================================

export async function handleCacheAlbumCoverArt(
  job: Job<CacheAlbumCoverArtJobData>
): Promise<unknown> {
  const data = job.data;
  const { albumId } = data;
  const startTime = Date.now();
  const llamaLogger = createLlamaLogger(prisma);

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
      await llamaLogger.logEnrichment({
        entityType: 'ALBUM',
        entityId: albumId,
        operation: JOB_TYPES.CACHE_ALBUM_COVER_ART,
        sources: ['CLOUDFLARE'],
        status: 'FAILED',
        reason: 'Album not found in database',
        fieldsEnriched: [],
        errorMessage: 'Album not found',
        errorCode: 'ALBUM_NOT_FOUND',
        durationMs: Date.now() - startTime,
        apiCallCount: 0,
        metadata: { requestedAlbumId: albumId },
        jobId: job.id,
        parentJobId: data.parentJobId || null,
        isRootJob: !data.parentJobId,
        triggeredBy: 'system',
      });
      throw new Error(`Album ${albumId} not found`);
    }

    // Skip if already cached
    if (album.cloudflareImageId && album.cloudflareImageId !== 'none') {
      await llamaLogger.logEnrichment({
        entityType: 'ALBUM',
        entityId: albumId,
        operation: JOB_TYPES.CACHE_ALBUM_COVER_ART,
        sources: ['CLOUDFLARE'],
        status: 'SKIPPED',
        reason: 'Album cover art already cached in Cloudflare',
        fieldsEnriched: [],
        durationMs: Date.now() - startTime,
        apiCallCount: 0,
        metadata: {
          albumTitle: album.title,
          existingCloudflareImageId: album.cloudflareImageId,
        },
        jobId: job.id,
        parentJobId: data.parentJobId || null,
        isRootJob: !data.parentJobId,
        triggeredBy: 'system',
      });

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

      await llamaLogger.logEnrichment({
        entityType: 'ALBUM',
        entityId: albumId,
        operation: JOB_TYPES.CACHE_ALBUM_COVER_ART,
        sources: ['CLOUDFLARE'],
        status: 'SKIPPED',
        reason: 'No source cover art URL available for album',
        fieldsEnriched: [],
        durationMs: Date.now() - startTime,
        apiCallCount: 0,
        metadata: { albumTitle: album.title },
        jobId: job.id,
        parentJobId: data.parentJobId || null,
        isRootJob: !data.parentJobId,
        triggeredBy: 'system',
      });

      return {
        success: true,
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
      await prisma.album.update({
        where: { id: albumId },
        data: { cloudflareImageId: 'none' },
      });

      await llamaLogger.logEnrichment({
        entityType: 'ALBUM',
        entityId: albumId,
        operation: JOB_TYPES.CACHE_ALBUM_COVER_ART,
        sources: ['CLOUDFLARE'],
        status: 'FAILED',
        reason: 'Failed to fetch cover art from source (404 or invalid URL)',
        fieldsEnriched: [],
        errorMessage: 'Cover art fetch failed',
        errorCode: 'IMAGE_FETCH_FAILED',
        durationMs: Date.now() - startTime,
        apiCallCount: 1,
        metadata: {
          albumTitle: album.title,
          sourceUrl: album.coverArtUrl,
        },
        jobId: job.id,
        parentJobId: data.parentJobId || null,
        isRootJob: !data.parentJobId,
        triggeredBy: 'system',
      });

      return {
        success: true,
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

    await llamaLogger.logEnrichment({
      entityType: 'ALBUM',
      entityId: albumId,
      operation: JOB_TYPES.CACHE_ALBUM_COVER_ART,
      sources: ['CLOUDFLARE'],
      status: 'SUCCESS',
      reason: 'Successfully cached album cover art to Cloudflare CDN',
      fieldsEnriched: ['cloudflareImageId'],
      dataQualityBefore: 'MEDIUM',
      dataQualityAfter: 'HIGH',
      durationMs: Date.now() - startTime,
      apiCallCount: 1,
      metadata: {
        albumTitle: album.title,
        beforeUrl: album.coverArtUrl,
        afterUrl: result.url,
        cloudflareImageId: result.id,
        cacheLocation: 'cloudflare_images',
      },
      jobId: job.id,
      parentJobId: data.parentJobId || null,
      isRootJob: !data.parentJobId,
      triggeredBy: 'system',
    });

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

    // Only log if we haven't already logged (album not found case)
    if (!errorMessage.includes('not found')) {
      await llamaLogger.logEnrichment({
        entityType: 'ALBUM',
        entityId: albumId,
        operation: JOB_TYPES.CACHE_ALBUM_COVER_ART,
        sources: ['CLOUDFLARE'],
        status: 'FAILED',
        reason: 'Unexpected error during caching operation',
        fieldsEnriched: [],
        errorMessage,
        errorCode: 'CACHE_ERROR',
        durationMs: Date.now() - startTime,
        apiCallCount: 1,
        metadata: { error: errorMessage },
        jobId: job.id,
        parentJobId: data.parentJobId || null,
        isRootJob: !data.parentJobId,
        triggeredBy: 'system',
      });
    }

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
  job: Job<CacheArtistImageJobData>
): Promise<unknown> {
  const data = job.data;
  const { artistId } = data;
  const startTime = Date.now();
  const llamaLogger = createLlamaLogger(prisma);

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
      await llamaLogger.logEnrichment({
        entityType: 'ARTIST',
        entityId: artistId,
        operation: JOB_TYPES.CACHE_ARTIST_IMAGE,
        sources: ['CLOUDFLARE'],
        status: 'FAILED',
        reason: 'Artist not found in database',
        fieldsEnriched: [],
        errorMessage: 'Artist not found',
        errorCode: 'ARTIST_NOT_FOUND',
        durationMs: Date.now() - startTime,
        apiCallCount: 0,
        metadata: { requestedArtistId: artistId },
        jobId: job.id,
        parentJobId: data.parentJobId || null,
        isRootJob: !data.parentJobId,
        triggeredBy: 'system',
      });
      throw new Error(`Artist ${artistId} not found`);
    }

    // Skip if already cached
    if (artist.cloudflareImageId && artist.cloudflareImageId !== 'none') {
      await llamaLogger.logEnrichment({
        entityType: 'ARTIST',
        entityId: artistId,
        operation: JOB_TYPES.CACHE_ARTIST_IMAGE,
        sources: ['CLOUDFLARE'],
        status: 'SKIPPED',
        reason: 'Artist image already cached in Cloudflare',
        fieldsEnriched: [],
        durationMs: Date.now() - startTime,
        apiCallCount: 0,
        metadata: {
          artistName: artist.name,
          existingCloudflareImageId: artist.cloudflareImageId,
        },
        jobId: job.id,
        parentJobId: data.parentJobId || null,
        isRootJob: !data.parentJobId,
        triggeredBy: 'system',
      });

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

      await llamaLogger.logEnrichment({
        entityType: 'ARTIST',
        entityId: artistId,
        operation: JOB_TYPES.CACHE_ARTIST_IMAGE,
        sources: ['CLOUDFLARE'],
        status: 'SKIPPED',
        reason: 'No source image URL available for artist',
        fieldsEnriched: [],
        durationMs: Date.now() - startTime,
        apiCallCount: 0,
        metadata: { artistName: artist.name },
        jobId: job.id,
        parentJobId: data.parentJobId || null,
        isRootJob: !data.parentJobId,
        triggeredBy: 'system',
      });

      return {
        success: true,
        cached: false,
        artistId,
        cloudflareImageId: 'none',
        message: 'No image URL available',
      };
    }

    // Import cacheArtistImage lazily to avoid circular dependencies
    const { cacheArtistImage: cacheArtistImageFn } = await import(
      '@/lib/cloudflare-images'
    );

    // Upload to Cloudflare
    const result = await cacheArtistImageFn(
      artist.imageUrl,
      artist.id,
      artist.name
    );

    if (!result) {
      await prisma.artist.update({
        where: { id: artistId },
        data: { cloudflareImageId: 'none' },
      });

      await llamaLogger.logEnrichment({
        entityType: 'ARTIST',
        entityId: artistId,
        operation: JOB_TYPES.CACHE_ARTIST_IMAGE,
        sources: ['CLOUDFLARE'],
        status: 'FAILED',
        reason: 'Failed to fetch artist image from source (404 or invalid URL)',
        fieldsEnriched: [],
        errorMessage: 'Image fetch failed',
        errorCode: 'IMAGE_FETCH_FAILED',
        durationMs: Date.now() - startTime,
        apiCallCount: 1,
        metadata: {
          artistName: artist.name,
          sourceUrl: artist.imageUrl,
        },
        jobId: job.id,
        parentJobId: data.parentJobId || null,
        isRootJob: !data.parentJobId,
        triggeredBy: 'system',
      });

      return {
        success: true,
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

    await llamaLogger.logEnrichment({
      entityType: 'ARTIST',
      entityId: artistId,
      operation: JOB_TYPES.CACHE_ARTIST_IMAGE,
      sources: ['CLOUDFLARE'],
      status: 'SUCCESS',
      reason: 'Successfully cached artist image to Cloudflare CDN',
      fieldsEnriched: ['cloudflareImageId'],
      dataQualityBefore: 'MEDIUM',
      dataQualityAfter: 'HIGH',
      durationMs: Date.now() - startTime,
      apiCallCount: 1,
      metadata: {
        artistName: artist.name,
        beforeUrl: artist.imageUrl,
        afterUrl: result.url,
        cloudflareImageId: result.id,
        cacheLocation: 'cloudflare_images',
      },
      jobId: job.id,
      parentJobId: data.parentJobId || null,
      isRootJob: !data.parentJobId,
      triggeredBy: 'system',
    });

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

    // Only log if we haven't already logged (artist not found case)
    if (!errorMessage.includes('not found')) {
      await llamaLogger.logEnrichment({
        entityType: 'ARTIST',
        entityId: artistId,
        operation: JOB_TYPES.CACHE_ARTIST_IMAGE,
        sources: ['CLOUDFLARE'],
        status: 'FAILED',
        reason: 'Unexpected error during caching operation',
        fieldsEnriched: [],
        errorMessage,
        errorCode: 'CACHE_ERROR',
        durationMs: Date.now() - startTime,
        apiCallCount: 1,
        metadata: { error: errorMessage },
        jobId: job.id,
        parentJobId: data.parentJobId || null,
        isRootJob: !data.parentJobId,
        triggeredBy: 'system',
      });
    }

    throw new Error(`Failed to cache artist ${artistId}: ${errorMessage}`);
  }
}
