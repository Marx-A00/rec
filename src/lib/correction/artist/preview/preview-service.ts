/**
 * ArtistCorrectionPreviewService - Orchestrates complete artist correction preview generation.
 *
 * Main entry point for the artist correction preview system. Fetches current artist,
 * counts albums, fetches full MusicBrainz artist data via queue, and generates all diffs.
 */

import type { Artist, PrismaClient } from '@prisma/client';

import { unifiedArtistService } from '@/lib/api/unified-artist-service';
import { getQueuedMusicBrainzService } from '@/lib/musicbrainz/queue-service';
import { prisma as defaultPrisma } from '@/lib/prisma';
import { PRIORITY_TIERS } from '@/lib/queue';

import { ArtistDiffEngine } from './diff-engine';
import type {
  ArtistCorrectionPreview,
  CorrectionSource,
  MBArtistData,
} from './types';

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
   * @param sourceArtistId - MusicBrainz or Discogs artist ID to fetch data from
   * @param source - Correction source ('musicbrainz' or 'discogs')
   * @returns Complete preview with all diffs and album count
   * @throws Error if artist not found in database
   */
  async generatePreview(
    artistId: string,
    sourceArtistId: string,
    source: CorrectionSource = 'musicbrainz'
  ): Promise<ArtistCorrectionPreview> {
    // Fetch current artist from database
    const currentArtist = await this.fetchCurrentArtist(artistId);
    if (!currentArtist) {
      throw new Error(`Artist not found: ${artistId}`);
    }

    // Count albums by this artist (for impact context)
    const albumCount = await this.countArtistAlbums(artistId);

    // Fetch source data based on correction source
    let mbArtistData: MBArtistData | null;
    if (source === 'discogs') {
      mbArtistData = await this.fetchDiscogsArtistData(sourceArtistId);
    } else {
      mbArtistData = await this.fetchMBArtistData(sourceArtistId);
    }

    if (!mbArtistData) {
      throw new Error(
        `Failed to fetch artist data from ${source}: ${sourceArtistId}`
      );
    }

    // Generate field diffs
    const fieldDiffs = this.diffEngine.generateFieldDiffs(
      currentArtist,
      mbArtistData,
      source
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

    const mbData = (await mbService.getArtist(
      artistMbid,
      ['aliases', 'tags'], // Include aliases and tags
      PRIORITY_TIERS.ADMIN
    )) as MBArtistAPIResponse;

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

  /**
   * Fetch Discogs artist data and transform to MBArtistData format.
   * Uses UnifiedArtistService for API access (handles rate limiting).
   */
  private async fetchDiscogsArtistData(
    discogsId: string
  ): Promise<MBArtistData | null> {
    try {
      const discogsArtist = await unifiedArtistService.getArtistDetails(
        discogsId,
        { source: 'discogs', skipLocalCache: true }
      );

      return this.transformDiscogsArtist(discogsArtist, discogsId);
    } catch (error) {
      console.error('Failed to fetch Discogs artist data:', error);
      return null;
    }
  }

  /**
   * Transform UnifiedArtistDetails (from Discogs) to MBArtistData format.
   * Builds biography from profile, realname, members, groups per CONTEXT.md.
   */
  private transformDiscogsArtist(
    artist: {
      name: string;
      realName?: string;
      profile?: string;
      imageUrl?: string;
      country?: string;
      members?: Array<{
        id?: string | number;
        name?: string;
        active?: boolean;
      }>;
      groups?: Array<{ id?: string | number; name?: string; active?: boolean }>;
    },
    discogsId: string
  ): MBArtistData {
    // Build biography from Discogs fields
    const biography = this.buildDiscogsArtistBiography(artist);

    return {
      id: discogsId,
      name: artist.name,
      sortName: artist.name, // Discogs doesn't have sort name
      disambiguation: biography, // Store combined biography in disambiguation
      type: undefined, // Discogs doesn't categorize Person/Group/Other
      country: undefined, // Discogs country not standardized
      area: undefined, // Discogs doesn't have area
      lifeSpan: undefined, // Discogs doesn't provide structured dates
      gender: undefined, // Discogs doesn't provide gender
      ipis: undefined,
      isnis: undefined,
      aliases: undefined,
    };
  }

  /**
   * Build artist biography from Discogs profile and related data.
   * Combines profile text, realname, members, and groups into structured sections.
   */
  private buildDiscogsArtistBiography(artist: {
    profile?: string;
    realName?: string;
    members?: Array<{ id?: string | number; name?: string; active?: boolean }>;
    groups?: Array<{ id?: string | number; name?: string; active?: boolean }>;
  }): string | undefined {
    const parts: string[] = [];

    // Strip BBCode from profile (Discogs uses [b], [i], [url=] etc.)
    if (artist.profile) {
      const cleanProfile = this.stripBBCode(artist.profile);
      if (cleanProfile.trim()) {
        parts.push(cleanProfile);
      }
    }

    // Add realname if different from display name
    if (artist.realName) {
      parts.push(`Real name: ${artist.realName}`);
    }

    // Add members (for groups)
    if (artist.members && artist.members.length > 0) {
      const memberNames = artist.members
        .map(m => m.name || String(m.id))
        .filter(Boolean)
        .join(', ');
      if (memberNames) {
        parts.push(`Members: ${memberNames}`);
      }
    }

    // Add groups (for solo artists)
    if (artist.groups && artist.groups.length > 0) {
      const groupNames = artist.groups
        .map(g => g.name || String(g.id))
        .filter(Boolean)
        .join(', ');
      if (groupNames) {
        parts.push(`Groups: ${groupNames}`);
      }
    }

    return parts.length > 0 ? parts.join('\n\n') : undefined;
  }

  /**
   * Strip BBCode formatting from Discogs text.
   * Removes [b], [i], [u], [url=], [artist], [label] tags.
   */
  private stripBBCode(text: string): string {
    return text
      .replace(/\[b\](.*?)\[\/b\]/gi, '$1')
      .replace(/\[i\](.*?)\[\/i\]/gi, '$1')
      .replace(/\[u\](.*?)\[\/u\]/gi, '$1')
      .replace(/\[url=(.*?)\](.*?)\[\/url\]/gi, '$2')
      .replace(/\[url\](.*?)\[\/url\]/gi, '$1')
      .replace(/\[a=?(.*?)\](.*?)\[\/a\]/gi, '$2') // [a=123]Name[/a] or [a]Name[/a]
      .replace(/\[l=?(.*?)\](.*?)\[\/l\]/gi, '$2') // [l=123]Name[/l] or [l]Name[/l]
      .replace(/\[[^\]]+\]/g, ''); // Remove any remaining tags
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
