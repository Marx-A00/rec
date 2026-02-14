// src/lib/musicbrainz/integration.ts
import chalk from 'chalk';
import { PrismaClient } from '@prisma/client';
import type { Artist, Album } from '@prisma/client';

import {
  validateArtistSearchResult,
  validateReleaseGroupSearchResult,
  type ValidatedArtistSearchResult,
  type ValidatedReleaseGroupSearchResult,
} from './schemas';
import {
  mapArtistSearchToCanonical,
  mapReleaseGroupSearchToCanonical,
  mapArtistCreditToCanonical,
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

      // Check if artist already exists by MusicBrainz ID
      const existingArtist = await this.prisma.artist.findUnique({
        where: { musicbrainzId: validatedArtist.id },
      });

      if (existingArtist) {
        return existingArtist;
      }

      // Create new artist with validated and mapped data
      const artistData = mapArtistSearchToCanonical(validatedArtist);

      const newArtist = await this.prisma.artist.create({
        data: artistData,
      });

      // Try to fetch artist image from Spotify (background context, latency OK)
      try {
        const { tryFetchSpotifyArtistImage } = await import(
          '../spotify/artist-image-helper'
        );
        const imageResult = await tryFetchSpotifyArtistImage(newArtist.name);
        if (imageResult) {
          const updated = await this.prisma.artist.update({
            where: { id: newArtist.id },
            data: {
              imageUrl: imageResult.imageUrl,
              spotifyId: newArtist.spotifyId || imageResult.spotifyId,
            },
          });

          // Queue Cloudflare caching for the image
          try {
            const { getMusicBrainzQueue } = await import(
              '../queue/musicbrainz-queue'
            );
            const { JOB_TYPES } = await import('../queue/jobs');
            const queue = getMusicBrainzQueue();
            await queue.addJob(
              JOB_TYPES.CACHE_ARTIST_IMAGE,
              { artistId: newArtist.id },
              {
                priority: 5,
                attempts: 3,
                backoff: { type: 'exponential', delay: 2000 },
              }
            );
          } catch {
            // Queue not available — image still saved, just not cached to CDN
          }

          console.log(
            chalk.magenta(
              `[TIER-2] Set image for artist "${newArtist.name}" from Spotify (integration-service)`
            )
          );
          return updated;
        }
      } catch (imgErr) {
        console.warn(
          `[Artist Image] Failed to fetch image for "${newArtist.name}":`,
          imgErr
        );
      }

      return newArtist;
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

        for (const credit of artistCredits) {
          // Find or create the artist
          let artist = await tx.artist.findUnique({
            where: { musicbrainzId: credit.artistId },
          });

          if (!artist) {
            // Create artist from credit info (minimal data)
            const artistData = mapArtistCreditToCanonical({
              artist: { id: credit.artistId, name: credit.name },
            });

            artist = await tx.artist.create({ data: artistData });
          }

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
