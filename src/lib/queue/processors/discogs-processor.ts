// src/lib/queue/processors/discogs-processor.ts
// Discogs API search and fetch handlers

import { Job } from 'bullmq';

import { prisma } from '@/lib/prisma';

import { createEnrichmentLogger } from '../../enrichment/enrichment-logger';
import type {
  DiscogsSearchArtistJobData,
  DiscogsGetArtistJobData,
  CacheArtistImageJobData,
} from '../jobs';
import { JOB_TYPES } from '../jobs';

import { calculateStringSimilarity } from './utils';

// ============================================================================
// Discogs Search Handler
// ============================================================================

/**
 * Search Discogs for artist by name when MusicBrainz doesn't provide Discogs ID
 */
export async function handleDiscogsSearchArtist(
  job: Job<DiscogsSearchArtistJobData>
): Promise<unknown> {
  const data = job.data;
  const rootJobId = data.parentJobId || job.id;
  const startTime = Date.now();
  const enrichmentLogger = createEnrichmentLogger(prisma);

  console.log(`🔍 Searching Discogs for artist: "${data.artistName}"`);

  try {
    // Initialize Discogs client via dynamic import (ESM-friendly)
    // Note: disconnect is a CommonJS module, default export has .Client property
    const Discogs = await import('disconnect');
    const discogsClient = new Discogs.default.Client({
      userAgent: 'RecProject/1.0 +https://rec-music.org',
      consumerKey: process.env.CONSUMER_KEY!,
      consumerSecret: process.env.CONSUMER_SECRET!,
    }).database();

    // Search for artist on Discogs
    const searchResults = await discogsClient.search({
      query: data.artistName,
      type: 'artist',
      per_page: 10,
    });

    if (!searchResults.results || searchResults.results.length === 0) {
      console.log(`❌ No Discogs results found for "${data.artistName}"`);

      await enrichmentLogger.logEnrichment({
        entityType: 'ARTIST',
        entityId: data.artistId,
        operation: JOB_TYPES.DISCOGS_SEARCH_ARTIST,
        sources: ['DISCOGS'],
        status: 'NO_DATA_AVAILABLE',
        reason: 'No Discogs results found for artist',
        fieldsEnriched: [],
        durationMs: Date.now() - startTime,
        apiCallCount: 1,
        metadata: {
          searchQuery: data.artistName,
          resultsCount: 0,
        },
        jobId: job.id,
        parentJobId: data.parentJobId || null,
        isRootJob: !data.parentJobId,
        triggeredBy: 'system',
      });

      return {
        artistId: data.artistId,
        action: 'no_results',
        searchedName: data.artistName,
      };
    }

    console.log(
      `📊 Found ${searchResults.results.length} Discogs results for "${data.artistName}"`
    );

    // Find best match using fuzzy matching
    const bestMatch = findBestDiscogsArtistMatch(
      data.artistName,
      searchResults.results
    );

    if (!bestMatch) {
      console.log(`❌ No confident match found for "${data.artistName}"`);

      await enrichmentLogger.logEnrichment({
        entityType: 'ARTIST',
        entityId: data.artistId,
        operation: JOB_TYPES.DISCOGS_SEARCH_ARTIST,
        sources: ['DISCOGS'],
        status: 'NO_DATA_AVAILABLE',
        reason: 'No confident match found (confidence < 85%)',
        fieldsEnriched: [],
        durationMs: Date.now() - startTime,
        apiCallCount: 1,
        metadata: {
          searchQuery: data.artistName,
          resultsCount: searchResults.results.length,
        },
        jobId: job.id,
        parentJobId: data.parentJobId || null,
        isRootJob: !data.parentJobId,
        triggeredBy: 'system',
      });

      return {
        artistId: data.artistId,
        action: 'no_confident_match',
        searchedName: data.artistName,
        resultsCount: searchResults.results.length,
      };
    }

    console.log(
      `✅ Found Discogs match: "${bestMatch.result.title}" (ID: ${bestMatch.result.id}, confidence: ${(bestMatch.score * 100).toFixed(1)}%)`
    );

    // Extract Discogs ID and queue fetch job
    const discogsId = bestMatch.result.id;

    // Update database with Discogs ID
    await prisma.artist.update({
      where: { id: data.artistId },
      data: { discogsId: String(discogsId) },
    });

    // Queue job to fetch artist details and image
    const queue = await import('../musicbrainz-queue').then(m =>
      m.getMusicBrainzQueue()
    );
    await queue.addJob(
      JOB_TYPES.DISCOGS_GET_ARTIST,
      {
        artistId: data.artistId,
        discogsId: String(discogsId),
        requestId: data.requestId,
        parentJobId: rootJobId,
      },
      {
        priority: 6, // Medium-low priority
        attempts: 3,
        backoff: { type: 'exponential', delay: 2000 },
      }
    );

    console.log(`📤 Queued Discogs fetch for artist ${data.artistId}`);

    await enrichmentLogger.logEnrichment({
      entityType: 'ARTIST',
      entityId: data.artistId,
      operation: JOB_TYPES.DISCOGS_SEARCH_ARTIST,
      sources: ['DISCOGS'],
      status: 'SUCCESS',
      reason: 'Found Discogs artist match and queued fetch job',
      fieldsEnriched: ['discogsId'],
      dataQualityBefore: 'LOW',
      dataQualityAfter: 'MEDIUM',
      durationMs: Date.now() - startTime,
      apiCallCount: 1,
      metadata: {
        searchQuery: data.artistName,
        discogsId: String(discogsId),
        discogsTitle: bestMatch.result.title,
        matchConfidence: bestMatch.score,
        resultsCount: searchResults.results.length,
      },
      jobId: job.id,
      parentJobId: data.parentJobId || null,
      isRootJob: !data.parentJobId,
      triggeredBy: 'system',
    });

    return {
      artistId: data.artistId,
      action: 'found_and_queued',
      discogsId: String(discogsId),
      matchConfidence: bestMatch.score,
      discogsTitle: bestMatch.result.title,
    };
  } catch (error) {
    console.error(`❌ Discogs search failed for "${data.artistName}":`, error);

    await enrichmentLogger.logEnrichment({
      entityType: 'ARTIST',
      entityId: data.artistId,
      operation: JOB_TYPES.DISCOGS_SEARCH_ARTIST,
      sources: ['DISCOGS'],
      status: 'FAILED',
      reason: 'Discogs API error',
      fieldsEnriched: [],
      errorMessage: error instanceof Error ? error.message : 'Unknown error',
      errorCode: 'DISCOGS_API_ERROR',
      durationMs: Date.now() - startTime,
      apiCallCount: 1,
      metadata: { searchQuery: data.artistName },
      jobId: job.id,
      parentJobId: data.parentJobId || null,
      isRootJob: !data.parentJobId,
      triggeredBy: 'system',
    });

    throw error;
  }
}

// ============================================================================
// Discogs Fetch Handler
// ============================================================================

/**
 * Fetch artist details and image from Discogs using Discogs ID
 */
export async function handleDiscogsGetArtist(
  job: Job<DiscogsGetArtistJobData>
): Promise<unknown> {
  const data = job.data;
  const rootJobId = data.parentJobId || job.id;
  const startTime = Date.now();
  const enrichmentLogger = createEnrichmentLogger(prisma);

  console.log(`🎤 Fetching Discogs artist details for ID: ${data.discogsId}`);

  try {
    // Use unified artist service to fetch Discogs data
    const { unifiedArtistService } = await import(
      '@/lib/api/unified-artist-service'
    );
    const discogsArtist = await unifiedArtistService.getArtistDetails(
      data.discogsId,
      { source: 'discogs', skipLocalCache: true }
    );

    if (!discogsArtist.imageUrl) {
      console.log(`⚠️ No image found for Discogs artist ${data.discogsId}`);

      await enrichmentLogger.logEnrichment({
        entityType: 'ARTIST',
        entityId: data.artistId,
        operation: JOB_TYPES.DISCOGS_GET_ARTIST,
        sources: ['DISCOGS'],
        status: 'PARTIAL_SUCCESS',
        reason: 'Discogs artist found but no image available',
        fieldsEnriched: [],
        durationMs: Date.now() - startTime,
        apiCallCount: 1,
        metadata: {
          discogsId: data.discogsId,
          imageFound: false,
        },
        jobId: job.id,
        parentJobId: data.parentJobId || null,
        isRootJob: !data.parentJobId,
        triggeredBy: 'system',
      });

      return {
        artistId: data.artistId,
        action: 'no_image',
        discogsId: data.discogsId,
      };
    }

    // Update artist with image URL
    await prisma.artist.update({
      where: { id: data.artistId },
      data: { imageUrl: discogsArtist.imageUrl },
    });

    console.log(`📸 Updated artist ${data.artistId} with Discogs image`);

    // Queue Cloudflare caching job
    const queue = await import('../musicbrainz-queue').then(m =>
      m.getMusicBrainzQueue()
    );

    const cacheJobData: CacheArtistImageJobData = {
      artistId: data.artistId,
      requestId: `discogs-cache-${data.artistId}`,
      parentJobId: rootJobId,
    };

    await queue.addJob(JOB_TYPES.CACHE_ARTIST_IMAGE, cacheJobData, {
      priority: 5,
      attempts: 3,
      backoff: { type: 'exponential', delay: 2000 },
    });

    console.log(`📤 Queued Cloudflare caching for artist ${data.artistId}`);

    await enrichmentLogger.logEnrichment({
      entityType: 'ARTIST',
      entityId: data.artistId,
      operation: JOB_TYPES.DISCOGS_GET_ARTIST,
      sources: ['DISCOGS'],
      status: 'SUCCESS',
      reason: 'Fetched Discogs artist details and queued image caching',
      fieldsEnriched: ['imageUrl'],
      dataQualityBefore: 'LOW',
      dataQualityAfter: 'MEDIUM',
      durationMs: Date.now() - startTime,
      apiCallCount: 1,
      metadata: {
        discogsId: data.discogsId,
        imageUrl: discogsArtist.imageUrl,
        imageFound: true,
      },
      jobId: job.id,
      parentJobId: data.parentJobId || null,
      isRootJob: !data.parentJobId,
      triggeredBy: 'system',
    });

    return {
      artistId: data.artistId,
      action: 'image_updated_and_queued_cache',
      discogsId: data.discogsId,
      imageUrl: discogsArtist.imageUrl,
    };
  } catch (error) {
    console.error(
      `❌ Failed to fetch Discogs artist ${data.discogsId}:`,
      error
    );

    await enrichmentLogger.logEnrichment({
      entityType: 'ARTIST',
      entityId: data.artistId,
      operation: JOB_TYPES.DISCOGS_GET_ARTIST,
      sources: ['DISCOGS'],
      status: 'FAILED',
      reason: 'Failed to fetch Discogs artist details',
      fieldsEnriched: [],
      errorMessage: error instanceof Error ? error.message : 'Unknown error',
      errorCode: 'DISCOGS_FETCH_ERROR',
      durationMs: Date.now() - startTime,
      apiCallCount: 1,
      metadata: { discogsId: data.discogsId },
      jobId: job.id,
      parentJobId: data.parentJobId || null,
      isRootJob: !data.parentJobId,
      triggeredBy: 'system',
    });

    throw error;
  }
}

// ============================================================================
// Helper Functions
// ============================================================================

interface DiscogsSearchResult {
  title: string;
  id: number | string;
}

/**
 * Find best matching Discogs artist result using fuzzy string matching
 */
export function findBestDiscogsArtistMatch(
  searchName: string,
  results: DiscogsSearchResult[]
): { result: DiscogsSearchResult; score: number } | null {
  let bestMatch = null;
  let bestScore = 0;

  for (const result of results) {
    // Extract artist name from result title
    // Discogs format: "Artist Name" or "Artist Name (2)" for disambiguation
    const resultName = result.title.replace(/\s*\(\d+\)$/, '').trim();

    // Calculate similarity score
    const similarity = calculateStringSimilarity(
      searchName.toLowerCase(),
      resultName.toLowerCase()
    );

    // Require high confidence (85%+) for Discogs matches
    if (similarity > bestScore && similarity >= 0.85) {
      bestScore = similarity;
      bestMatch = { result, score: similarity };
    }
  }

  return bestMatch;
}
