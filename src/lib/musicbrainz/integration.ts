// src/lib/musicbrainz/integration.ts
import { PrismaClient } from '@prisma/client';
import type { Artist, Album } from '@prisma/client';
import { getInitialQuality } from '@/lib/db';

import {
  validateArtistSearchResult,
  validateReleaseGroupSearchResult,
} from './schemas';
import {
  mapArtistSearchToCanonical,
  mapReleaseGroupSearchToCanonical,
  extractArtistCreditsFromReleaseGroup,
} from './mappers';

/**
 * Integration service for creating canonical music entities from MusicBrainz data
 * Handles validation, mapping, and database operations with deduplication
 */
export class MusicBrainzIntegrationService {
  constructor(private prisma: PrismaClient) {}

  /**
   * Find or create an artist from MusicBrainz search result data
   * Validates the data structure and handles deduplication by MusicBrainz ID
   */
  async findOrCreateArtist(rawMbArtist: unknown): Promise<Artist> {
    try {
      // Validate the raw data structure
      const validatedArtist = validateArtistSearchResult(rawMbArtist);
      const artistData = mapArtistSearchToCanonical(validatedArtist);

      const { findOrCreateArtist: sharedFindOrCreate } = await import(
        '../artists'
      );
      const { artist } = await sharedFindOrCreate({
        db: this.prisma,
        identity: {
          name: artistData.name,
          musicbrainzId: artistData.musicbrainzId ?? undefined,
        },
        fields: {
          source: 'MUSICBRAINZ' as const,
          ...getInitialQuality({ musicbrainzId: artistData.musicbrainzId }),
          formedYear: artistData.formedYear,
          countryCode: artistData.countryCode,
          biography: artistData.biography,
        },
        enrichment: 'inline-fetch',
        caller: 'integration-service',
      });

      return artist;
    } catch (error) {
      console.error('Failed to process MusicBrainz artist data:', error);
      throw new Error(
        `Failed to create artist: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Find or create an album from MusicBrainz release group data
   * Also creates/links associated artists and handles relationships
   *
   * Duplicate detection:
   * 1. Check by MusicBrainz ID (exact match)
   * 2. Check by title + artist + year (fuzzy match to catch cross-source duplicates)
   */
  async findOrCreateAlbumWithArtists(
    rawMbReleaseGroup: unknown
  ): Promise<Album> {
    try {
      // Validate the raw data structure
      const validatedReleaseGroup =
        validateReleaseGroupSearchResult(rawMbReleaseGroup);

      // Check 1: Album already exists by MusicBrainz ID (fast, exact)
      const existingByMbId = await this.prisma.album.findUnique({
        where: { musicbrainzId: validatedReleaseGroup.id },
        include: { artists: { include: { artist: true } } },
      });

      if (existingByMbId) {
        return existingByMbId;
      }

      // Check 2: Album exists by title + artist + year (catches cross-source duplicates)
      // This prevents duplicates when an album was already added from Spotify/Discogs
      const artistCredits = extractArtistCreditsFromReleaseGroup(
        validatedReleaseGroup
      );
      const primaryArtistName = artistCredits[0]?.name;
      const releaseYear = validatedReleaseGroup.firstReleaseDate
        ? parseInt(validatedReleaseGroup.firstReleaseDate.split('-')[0])
        : null;

      if (primaryArtistName && releaseYear) {
        // Calculate year range for matching (same year or +/- 1 year for edge cases)
        const yearStart = new Date(releaseYear - 1, 0, 1);
        const yearEnd = new Date(releaseYear + 2, 0, 1); // +2 because end is exclusive

        const existingByTitleArtistYear = await this.prisma.album.findFirst({
          where: {
            title: {
              equals: validatedReleaseGroup.title,
              mode: 'insensitive',
            },
            artists: {
              some: {
                artist: {
                  name: {
                    equals: primaryArtistName,
                    mode: 'insensitive',
                  },
                },
              },
            },
            releaseDate: {
              gte: yearStart,
              lt: yearEnd,
            },
          },
          include: { artists: { include: { artist: true } } },
        });

        if (existingByTitleArtistYear) {
          // Update the existing album with MusicBrainz ID if it doesn't have one
          if (!existingByTitleArtistYear.musicbrainzId) {
            await this.prisma.album.update({
              where: { id: existingByTitleArtistYear.id },
              data: { musicbrainzId: validatedReleaseGroup.id },
            });
          }

          return existingByTitleArtistYear;
        }
      }

      // No duplicate found - create album and handle artist relationships in a transaction
      return await this.prisma.$transaction(async tx => {
        // Create the album first
        const albumData = mapReleaseGroupSearchToCanonical(
          validatedReleaseGroup
        );
        const album = await tx.album.create({
          data: albumData,
          include: { artists: { include: { artist: true } } },
        });

        // Handle artist credits (create artists and relationships)
        const artistCredits = extractArtistCreditsFromReleaseGroup(
          validatedReleaseGroup
        );

        const { findOrCreateArtist: sharedFindOrCreate } = await import(
          '../artists'
        );

        for (const credit of artistCredits) {
          const { artist } = await sharedFindOrCreate({
            db: tx,
            identity: {
              name: credit.name,
              musicbrainzId: credit.artistId,
            },
            fields: {
              source: 'MUSICBRAINZ' as const,
              ...getInitialQuality({ musicbrainzId: credit.artistId }),
            },
            enrichment: 'none',
            insideTransaction: true,
            caller: 'integration-service:albumWithArtists',
          });

          // Create the album-artist relationship
          await tx.albumArtist.create({
            data: {
              albumId: album.id,
              artistId: artist.id,
              role: 'primary',
              position: credit.position,
            },
          });
        }

        return album;
      });
    } catch (error) {
      console.error('Failed to process MusicBrainz release group data:', error);
      throw new Error(
        `Failed to create album: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Batch process multiple artists from search results
   * Useful for processing search result arrays
   */
  async batchCreateArtists(rawMbArtists: unknown[]): Promise<Artist[]> {
    const results: Artist[] = [];

    for (const rawArtist of rawMbArtists) {
      try {
        const artist = await this.findOrCreateArtist(rawArtist);
        results.push(artist);
      } catch (error) {
        console.error('Failed to process artist in batch:', error);
        // Continue processing other artists even if one fails
      }
    }

    return results;
  }

  /**
   * Batch process multiple albums from search results
   * Useful for processing search result arrays
   */
  async batchCreateAlbums(rawMbReleaseGroups: unknown[]): Promise<Album[]> {
    const results: Album[] = [];

    for (const rawReleaseGroup of rawMbReleaseGroups) {
      try {
        const album = await this.findOrCreateAlbumWithArtists(rawReleaseGroup);
        results.push(album);
      } catch (error) {
        console.error('Failed to process album in batch:', error);
        // Continue processing other albums even if one fails
      }
    }

    return results;
  }

  /**
   * Get or create an artist by MusicBrainz ID (for when you only have the ID)
   * This would trigger a full lookup from MusicBrainz API if needed
   */
  async ensureArtistByMusicBrainzId(
    musicbrainzId: string
  ): Promise<Artist | null> {
    // Check if we already have this artist
    const existingArtist = await this.prisma.artist.findUnique({
      where: { musicbrainzId },
    });

    if (existingArtist) {
      return existingArtist;
    }

    // TODO: In future iterations, we could fetch from MusicBrainz API here
    // For now, just return null if we don't have the artist
    console.warn(
      `Artist with MusicBrainz ID ${musicbrainzId} not found and auto-fetch not implemented yet`
    );
    return null;
  }

  /**
   * Get stats about MusicBrainz integration coverage
   */
  async getIntegrationStats() {
    const [totalArtists, artistsWithMbId, totalAlbums, albumsWithMbId] =
      await Promise.all([
        this.prisma.artist.count(),
        this.prisma.artist.count({ where: { musicbrainzId: { not: null } } }),
        this.prisma.album.count(),
        this.prisma.album.count({ where: { musicbrainzId: { not: null } } }),
      ]);

    return {
      artists: {
        total: totalArtists,
        withMusicBrainzId: artistsWithMbId,
        coverage:
          totalArtists > 0
            ? ((artistsWithMbId / totalArtists) * 100).toFixed(1)
            : '0',
      },
      albums: {
        total: totalAlbums,
        withMusicBrainzId: albumsWithMbId,
        coverage:
          totalAlbums > 0
            ? ((albumsWithMbId / totalAlbums) * 100).toFixed(1)
            : '0',
      },
    };
  }
}

// Export a default instance (you can inject your own Prisma client as needed)
// In production, you'd probably want to inject this via dependency injection
export function createMusicBrainzIntegrationService(
  prisma: PrismaClient
): MusicBrainzIntegrationService {
  return new MusicBrainzIntegrationService(prisma);
}
