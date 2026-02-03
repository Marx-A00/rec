/**
 * ArtistCorrectionPreviewService - Orchestrates complete artist correction preview generation.
 *
 * Main entry point for the artist correction preview system. Fetches current artist,
 * counts albums, fetches full MusicBrainz artist data via queue, and generates all diffs.
 */

import type { Artist, PrismaClient } from '@prisma/client';

import { getQueuedMusicBrainzService } from '@/lib/musicbrainz/queue-service';
import { prisma as defaultPrisma } from '@/lib/prisma';
import { PRIORITY_TIERS } from '@/lib/queue';

import { ArtistDiffEngine } from './diff-engine';
import type { ArtistCorrectionPreview, MBArtistData } from './types';

/**
 * Raw MusicBrainz API artist response structure.
 * Based on /ws/2/artist endpoint with includes.
 */
interface MBArtistAPIResponse {
  id: string;
  name: string;
  'sort-name'?: string;
  disambiguation?: string;
  type?: string;
  country?: string;
  area?: {
    id: string;
    name: string;
    'iso-3166-1-codes'?: string[];
  };
  'life-span'?: {
    begin?: string;
    end?: string;
    ended?: boolean;
  };
  gender?: string;
  ipis?: string[];
  isnis?: string[];
  aliases?: Array<{
    name: string;
    'sort-name'?: string;
    type?: string;
    locale?: string;
    primary?: boolean;
  }>;
}

/**
 * Service for generating artist correction previews.
 * Orchestrates fetching artist data, MusicBrainz data, and diff generation.
 */
export class ArtistCorrectionPreviewService {
  private diffEngine: ArtistDiffEngine;
  private prisma: PrismaClient;

  /**
   * Create a new ArtistCorrectionPreviewService.
   *
   * @param prismaClient - Optional PrismaClient for testing
   */
  constructor(prismaClient?: PrismaClient) {
    this.diffEngine = new ArtistDiffEngine();
    this.prisma = prismaClient ?? (defaultPrisma as unknown as PrismaClient);
  }

  /**
   * Generate complete artist correction preview.
   *
   * @param artistId - Internal database ID of the artist to correct
   * @param artistMbid - MusicBrainz artist ID to fetch data from
   * @returns Complete preview with all diffs and album count
   * @throws Error if artist not found in database
   */
  async generatePreview(
    artistId: string,
    artistMbid: string
  ): Promise<ArtistCorrectionPreview> {
    // Fetch current artist from database
    const currentArtist = await this.fetchCurrentArtist(artistId);
    if (!currentArtist) {
      throw new Error(`Artist not found: ${artistId}`);
    }

    // Count albums by this artist (for impact context)
    const albumCount = await this.countArtistAlbums(artistId);

    // Fetch full MusicBrainz artist data (high priority - admin action)
    const mbArtistData = await this.fetchMBArtistData(artistMbid);

    // Generate field diffs
    const fieldDiffs = this.diffEngine.generateFieldDiffs(
      currentArtist,
      mbArtistData
    );

    // Generate summary statistics
    const summary = this.diffEngine.generateSummary(fieldDiffs);

    return {
      currentArtist,
      mbArtistData,
      fieldDiffs,
      albumCount,
      summary,
    };
  }

  /**
   * Fetch current artist from database.
   */
  private async fetchCurrentArtist(artistId: string): Promise<Artist | null> {
    return this.prisma.artist.findUnique({
      where: { id: artistId },
    });
  }

  /**
   * Count albums by this artist.
   * Uses AlbumArtist join table for accurate count.
   */
  private async countArtistAlbums(artistId: string): Promise<number> {
    return this.prisma.albumArtist.count({
      where: { artistId },
    });
  }

  /**
   * Fetch full MusicBrainz artist data via queue.
   * Uses ADMIN priority tier for immediate processing.
   *
   * @param artistMbid - MusicBrainz artist ID
   * @returns Transformed MBArtistData
   * @throws Error if MusicBrainz fetch fails
   */
  private async fetchMBArtistData(artistMbid: string): Promise<MBArtistData> {
    const mbService = getQueuedMusicBrainzService();

    const response = await mbService.getArtist(
      artistMbid,
      ['aliases', 'tags'], // Include aliases and tags
      PRIORITY_TIERS.ADMIN
    );

    // Queue service returns { data, requestedMbid, returnedMbid, wasRedirected }
    // Extract the actual artist data from the response
    const mbData = (response as { data: MBArtistAPIResponse }).data;

    if (!mbData) {
      throw new Error(
        `MusicBrainz returned empty data for artist ${artistMbid}`
      );
    }

    const transformed = this.transformMBArtist(mbData);

    if (!transformed) {
      throw new Error(
        `Failed to transform MusicBrainz data for artist ${artistMbid}`
      );
    }

    return transformed;
  }

  /**
   * Transform raw MusicBrainz API response to MBArtistData structure.
   *
   * Transformations:
   * - Convert hyphenated keys to camelCase
   * - Extract lifeSpan.begin/end (preserve partial dates as strings)
   * - Extract first IPI and ISNI from arrays
   * - Map area.name to area string
   */
  private transformMBArtist(mbData: MBArtistAPIResponse): MBArtistData | null {
    if (!mbData) return null;

    return {
      id: mbData.id,
      name: mbData.name,
      sortName: mbData['sort-name'],
      disambiguation: mbData.disambiguation,
      type: mbData.type,
      country: mbData.country,
      area: mbData.area
        ? {
            id: mbData.area.id,
            name: mbData.area.name,
            iso31661Code: mbData.area['iso-3166-1-codes']?.[0],
          }
        : undefined,
      lifeSpan: mbData['life-span']
        ? {
            begin: mbData['life-span'].begin,
            end: mbData['life-span'].end,
            ended: mbData['life-span'].ended,
          }
        : undefined,
      gender: mbData.gender,
      ipis: mbData.ipis,
      isnis: mbData.isnis,
      aliases: mbData.aliases?.map(alias => ({
        name: alias.name,
        sortName: alias['sort-name'],
        type: alias.type,
        locale: alias.locale,
        primary: alias.primary,
      })),
    };
  }
}

// ============================================================================
// Singleton Instance
// ============================================================================

const globalForPreview = global as unknown as {
  artistCorrectionPreviewServiceInstance?: ArtistCorrectionPreviewService;
};

/**
 * Get singleton ArtistCorrectionPreviewService instance.
 * Safe for Next.js HMR in development.
 */
export function getArtistCorrectionPreviewService(): ArtistCorrectionPreviewService {
  if (!globalForPreview.artistCorrectionPreviewServiceInstance) {
    globalForPreview.artistCorrectionPreviewServiceInstance =
      new ArtistCorrectionPreviewService();
  }
  return globalForPreview.artistCorrectionPreviewServiceInstance;
}
