// src/lib/enrichment/preview-enrichment.ts
// Preview enrichment logic - runs fetch/matching without persisting changes

import { EnrichmentStatus } from '@prisma/client';

import { prisma } from '@/lib/prisma';

import { musicBrainzService } from '../musicbrainz';
import {
  buildAlbumSearchQuery,
  findBestAlbumMatch,
  findBestArtistMatch,
} from '../queue/processors/utils';

export interface EnrichmentFieldDiff {
  field: string;
  currentValue: string | null;
  newValue: string | null;
  source: string;
}

export interface PreviewEnrichmentResult {
  success: boolean;
  message: string | null;
  matchScore: number | null;
  matchedEntity: string | null;
  sources: string[];
  fieldsToUpdate: EnrichmentFieldDiff[];
  enrichmentLogId: string;
  rawData: Record<string, unknown> | null;
}

/**
 * Preview album enrichment - fetches data from external sources
 * and shows what would be updated, without actually persisting changes.
 * Saves result to EnrichmentLog with PREVIEW status.
 */
export async function previewAlbumEnrichment(
  albumId: string
): Promise<PreviewEnrichmentResult> {
  const startTime = Date.now();
  const sourcesAttempted: string[] = [];
  const fieldsToUpdate: EnrichmentFieldDiff[] = [];
  let matchScore: number | null = null;
  let matchedEntity: string | null = null;
  let rawData: Record<string, unknown> | null = null;
  let message: string | null = null;

  // Fetch album from database
  const album = await prisma.album.findUnique({
    where: { id: albumId },
    include: {
      artists: { include: { artist: true } },
      tracks: true,
    },
  });

  if (!album) {
    throw new Error(`Album not found: ${albumId}`);
  }

  const artistName = album.artists?.[0]?.artist?.name || 'Unknown Artist';

  try {
    let mbData: Record<string, unknown> | null = null;

    // If we have a MusicBrainz ID, fetch directly
    if (album.musicbrainzId) {
      sourcesAttempted.push('MUSICBRAINZ');
      try {
        const mbResult = await musicBrainzService.getReleaseGroup(
          album.musicbrainzId,
          ['artists', 'tags', 'releases']
        );
        if (mbResult) {
          mbData = JSON.parse(JSON.stringify(mbResult));
          matchScore = 1.0; // Direct ID match
          matchedEntity = `${mbData?.title} (MusicBrainz ID match)`;
          rawData = mbData;
        }
      } catch (error) {
        console.warn(
          `MusicBrainz lookup failed for ${album.musicbrainzId}:`,
          error
        );
        message = `MusicBrainz lookup failed: ${error instanceof Error ? error.message : 'Unknown error'}`;
      }
    }

    // If no MusicBrainz ID or lookup failed, try searching
    if (!mbData && album.title) {
      if (!sourcesAttempted.includes('MUSICBRAINZ')) {
        sourcesAttempted.push('MUSICBRAINZ');
      }

      try {
        const searchQuery = buildAlbumSearchQuery(album);
        const searchResults = await musicBrainzService.searchReleaseGroups(
          searchQuery,
          10
        );

        if (searchResults && searchResults.length > 0) {
          const bestMatch = findBestAlbumMatch(album, searchResults);

          if (bestMatch) {
            matchScore = bestMatch.score;
            matchedEntity = `${bestMatch.result.title} by ${
              bestMatch.result.artistCredit
                ?.map((ac: { name: string }) => ac.name)
                .join(', ') || 'Unknown'
            }`;

            // Fetch full data for best match
            const mbResult = await musicBrainzService.getReleaseGroup(
              bestMatch.result.id,
              ['artists', 'tags', 'releases']
            );
            mbData = JSON.parse(JSON.stringify(mbResult));
            rawData = {
              searchQuery,
              searchResultsCount: searchResults.length,
              bestMatch: {
                id: bestMatch.result.id,
                title: bestMatch.result.title,
                score: bestMatch.score,
                mbScore: bestMatch.mbScore,
                jaccardScore: bestMatch.jaccardScore,
              },
              fullData: mbData,
            };
          } else {
            message = `No suitable match found. ${searchResults.length} results returned but none met the 80% threshold.`;
            rawData = {
              searchQuery,
              searchResultsCount: searchResults.length,
              topResults: searchResults.slice(0, 5).map(r => ({
                id: r.id,
                title: r.title,
                score: r.score,
                artistCredit: r.artistCredit,
              })),
            };
          }
        } else {
          message = 'No search results returned from MusicBrainz';
          rawData = { searchQuery, searchResultsCount: 0 };
        }
      } catch (error) {
        message = `MusicBrainz search failed: ${error instanceof Error ? error.message : 'Unknown error'}`;
      }
    }

    // Compare fields if we have data
    if (mbData) {
      // Title
      if (mbData.title && mbData.title !== album.title) {
        fieldsToUpdate.push({
          field: 'title',
          currentValue: album.title,
          newValue: mbData.title as string,
          source: 'MUSICBRAINZ',
        });
      }

      // Release date
      const mbReleaseDate = mbData['first-release-date'] as string | undefined;
      const currentReleaseDate = album.releaseDate?.toISOString().split('T')[0];
      if (mbReleaseDate && mbReleaseDate !== currentReleaseDate) {
        fieldsToUpdate.push({
          field: 'releaseDate',
          currentValue: currentReleaseDate || null,
          newValue: mbReleaseDate,
          source: 'MUSICBRAINZ',
        });
      }

      // MusicBrainz ID (if we found via search)
      if (!album.musicbrainzId && mbData.id) {
        fieldsToUpdate.push({
          field: 'musicbrainzId',
          currentValue: null,
          newValue: mbData.id as string,
          source: 'MUSICBRAINZ',
        });
      }

      // Genres from tags
      const mbTags = mbData.tags as
        | Array<{ name: string; count?: number }>
        | undefined;
      if (mbTags && mbTags.length > 0) {
        const newGenres = mbTags
          .sort((a, b) => (b.count || 0) - (a.count || 0))
          .slice(0, 5)
          .map(t => t.name);
        const currentGenres = album.genres || [];
        if (JSON.stringify(newGenres) !== JSON.stringify(currentGenres)) {
          fieldsToUpdate.push({
            field: 'genres',
            currentValue: currentGenres.join(', ') || null,
            newValue: newGenres.join(', '),
            source: 'MUSICBRAINZ',
          });
        }
      }

      // Primary type
      const mbPrimaryType = mbData['primary-type'] as string | undefined;
      if (mbPrimaryType && mbPrimaryType !== album.releaseType) {
        fieldsToUpdate.push({
          field: 'releaseType',
          currentValue: album.releaseType || null,
          newValue: mbPrimaryType,
          source: 'MUSICBRAINZ',
        });
      }

      // Tracks count
      const mbReleases = mbData.releases as
        | Array<{ 'track-count'?: number }>
        | undefined;
      if (mbReleases && mbReleases.length > 0) {
        const mbTrackCount = mbReleases[0]['track-count'];
        if (mbTrackCount && mbTrackCount !== album.trackCount) {
          fieldsToUpdate.push({
            field: 'trackCount',
            currentValue: album.trackCount?.toString() || null,
            newValue: mbTrackCount.toString(),
            source: 'MUSICBRAINZ',
          });
        }
      }

      message =
        matchScore && matchScore >= 0.8
          ? `Found match with ${(matchScore * 100).toFixed(1)}% confidence. ${fieldsToUpdate.length} field(s) would be updated.`
          : `Match found but confidence too low (${((matchScore || 0) * 100).toFixed(1)}%). Manual review recommended.`;
    }

    // Save to EnrichmentLog with PREVIEW status
    const enrichmentLog = await prisma.enrichmentLog.create({
      data: {
        entityType: 'ALBUM',
        entityId: albumId,
        albumId: albumId,
        operation: 'PREVIEW_ENRICHMENT',
        sources: sourcesAttempted,
        status: EnrichmentStatus.PREVIEW,
        reason: message || 'Preview enrichment completed',
        fieldsEnriched: fieldsToUpdate.map(f => f.field),
        dataQualityBefore: album.dataQuality || 'LOW',
        dataQualityAfter: album.dataQuality || 'LOW', // Not changing since it's a preview
        durationMs: Date.now() - startTime,
        apiCallCount: sourcesAttempted.length,
        triggeredBy: 'admin_preview',
        previewData: JSON.parse(
          JSON.stringify({
            matchScore,
            matchedEntity,
            fieldsToUpdate,
            rawData,
          })
        ),
        metadata: {
          albumTitle: album.title,
          artistName,
        },
      },
    });

    return {
      success: true,
      message,
      matchScore,
      matchedEntity,
      sources: sourcesAttempted,
      fieldsToUpdate,
      enrichmentLogId: enrichmentLog.id,
      rawData,
    };
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : 'Unknown error';

    // Log the failed preview
    const enrichmentLog = await prisma.enrichmentLog.create({
      data: {
        entityType: 'ALBUM',
        entityId: albumId,
        albumId: albumId,
        operation: 'PREVIEW_ENRICHMENT',
        sources: sourcesAttempted,
        status: EnrichmentStatus.PREVIEW,
        reason: `Preview failed: ${errorMessage}`,
        fieldsEnriched: [],
        errorMessage,
        durationMs: Date.now() - startTime,
        apiCallCount: sourcesAttempted.length,
        triggeredBy: 'admin_preview',
        metadata: {
          albumTitle: album.title,
          artistName,
        },
      },
    });

    return {
      success: false,
      message: errorMessage,
      matchScore: null,
      matchedEntity: null,
      sources: sourcesAttempted,
      fieldsToUpdate: [],
      enrichmentLogId: enrichmentLog.id,
      rawData: null,
    };
  }
}

/**
 * Preview artist enrichment - fetches data from external sources
 * and shows what would be updated, without actually persisting changes.
 */
export async function previewArtistEnrichment(
  artistId: string
): Promise<PreviewEnrichmentResult> {
  const startTime = Date.now();
  const sourcesAttempted: string[] = [];
  const fieldsToUpdate: EnrichmentFieldDiff[] = [];
  let matchScore: number | null = null;
  let matchedEntity: string | null = null;
  let rawData: Record<string, unknown> | null = null;
  let message: string | null = null;

  // Fetch artist from database
  const artist = await prisma.artist.findUnique({
    where: { id: artistId },
  });

  if (!artist) {
    throw new Error(`Artist not found: ${artistId}`);
  }

  try {
    let mbData: Record<string, unknown> | null = null;

    // If we have a MusicBrainz ID, fetch directly
    if (artist.musicbrainzId) {
      sourcesAttempted.push('MUSICBRAINZ');
      try {
        const mbResult = await musicBrainzService.getArtist(
          artist.musicbrainzId,
          ['url-rels', 'tags']
        );
        if (mbResult) {
          mbData = JSON.parse(JSON.stringify(mbResult));
          matchScore = 1.0;
          matchedEntity = `${mbData?.name} (MusicBrainz ID match)`;
          rawData = mbData;
        }
      } catch (error) {
        console.warn(`MusicBrainz artist lookup failed:`, error);
        message = `MusicBrainz lookup failed: ${error instanceof Error ? error.message : 'Unknown error'}`;
      }
    }

    // If no MusicBrainz ID or lookup failed, try searching
    if (!mbData && artist.name) {
      if (!sourcesAttempted.includes('MUSICBRAINZ')) {
        sourcesAttempted.push('MUSICBRAINZ');
      }

      try {
        const searchResults = await musicBrainzService.searchArtists(
          artist.name,
          10
        );

        if (searchResults && searchResults.length > 0) {
          const bestMatch = findBestArtistMatch(artist, searchResults);

          if (bestMatch) {
            matchScore = bestMatch.score;
            matchedEntity = `${bestMatch.result.name}${
              bestMatch.result.disambiguation
                ? ` (${bestMatch.result.disambiguation})`
                : ''
            }`;

            // Fetch full data for best match
            const mbResult = await musicBrainzService.getArtist(
              bestMatch.result.id,
              ['url-rels', 'tags']
            );
            mbData = JSON.parse(JSON.stringify(mbResult));
            rawData = {
              searchResultsCount: searchResults.length,
              bestMatch: {
                id: bestMatch.result.id,
                name: bestMatch.result.name,
                score: bestMatch.score,
              },
              fullData: mbData,
            };
          } else {
            message = `No suitable match found. ${searchResults.length} results returned.`;
            rawData = {
              searchResultsCount: searchResults.length,
              topResults: searchResults.slice(0, 5).map(r => ({
                id: r.id,
                name: r.name,
                score: r.score,
                disambiguation: r.disambiguation,
              })),
            };
          }
        } else {
          message = 'No search results returned from MusicBrainz';
        }
      } catch (error) {
        message = `MusicBrainz search failed: ${error instanceof Error ? error.message : 'Unknown error'}`;
      }
    }

    // Compare fields if we have data
    if (mbData) {
      // Name
      if (mbData.name && mbData.name !== artist.name) {
        fieldsToUpdate.push({
          field: 'name',
          currentValue: artist.name,
          newValue: mbData.name as string,
          source: 'MUSICBRAINZ',
        });
      }

      // MusicBrainz ID
      if (!artist.musicbrainzId && mbData.id) {
        fieldsToUpdate.push({
          field: 'musicbrainzId',
          currentValue: null,
          newValue: mbData.id as string,
          source: 'MUSICBRAINZ',
        });
      }

      // Country
      const mbArea = mbData.area as
        | { 'iso-3166-1-codes'?: string[] }
        | undefined;
      if (mbArea?.['iso-3166-1-codes']?.[0]) {
        const countryCode = mbArea['iso-3166-1-codes'][0];
        if (countryCode !== artist.countryCode) {
          fieldsToUpdate.push({
            field: 'countryCode',
            currentValue: artist.countryCode || null,
            newValue: countryCode,
            source: 'MUSICBRAINZ',
          });
        }
      }

      // Genres from tags
      const mbTags = mbData.tags as
        | Array<{ name: string; count?: number }>
        | undefined;
      if (mbTags && mbTags.length > 0) {
        const newGenres = mbTags
          .sort((a, b) => (b.count || 0) - (a.count || 0))
          .slice(0, 5)
          .map(t => t.name);
        const currentGenres = artist.genres || [];
        if (JSON.stringify(newGenres) !== JSON.stringify(currentGenres)) {
          fieldsToUpdate.push({
            field: 'genres',
            currentValue: currentGenres.join(', ') || null,
            newValue: newGenres.join(', '),
            source: 'MUSICBRAINZ',
          });
        }
      }

      // Life span / formed year
      const mbLifeSpan = mbData['life-span'] as { begin?: string } | undefined;
      if (mbLifeSpan?.begin) {
        const formedYear = parseInt(mbLifeSpan.begin.split('-')[0]);
        if (!isNaN(formedYear) && formedYear !== artist.formedYear) {
          fieldsToUpdate.push({
            field: 'formedYear',
            currentValue: artist.formedYear?.toString() || null,
            newValue: formedYear.toString(),
            source: 'MUSICBRAINZ',
          });
        }
      }

      // Artist type
      const mbType = mbData.type as string | undefined;
      if (mbType && mbType !== artist.artistType) {
        fieldsToUpdate.push({
          field: 'artistType',
          currentValue: artist.artistType || null,
          newValue: mbType,
          source: 'MUSICBRAINZ',
        });
      }

      message =
        matchScore && matchScore >= 0.8
          ? `Found match with ${(matchScore * 100).toFixed(1)}% confidence. ${fieldsToUpdate.length} field(s) would be updated.`
          : `Match found but confidence too low (${((matchScore || 0) * 100).toFixed(1)}%). Manual review recommended.`;
    }

    // Save to EnrichmentLog with PREVIEW status
    const enrichmentLog = await prisma.enrichmentLog.create({
      data: {
        entityType: 'ARTIST',
        entityId: artistId,
        artistId: artistId,
        operation: 'PREVIEW_ENRICHMENT',
        sources: sourcesAttempted,
        status: EnrichmentStatus.PREVIEW,
        reason: message || 'Preview enrichment completed',
        fieldsEnriched: fieldsToUpdate.map(f => f.field),
        dataQualityBefore: artist.dataQuality || 'LOW',
        dataQualityAfter: artist.dataQuality || 'LOW',
        durationMs: Date.now() - startTime,
        apiCallCount: sourcesAttempted.length,
        triggeredBy: 'admin_preview',
        previewData: JSON.parse(
          JSON.stringify({
            matchScore,
            matchedEntity,
            fieldsToUpdate,
            rawData,
          })
        ),
        metadata: {
          artistName: artist.name,
        },
      },
    });

    return {
      success: true,
      message,
      matchScore,
      matchedEntity,
      sources: sourcesAttempted,
      fieldsToUpdate,
      enrichmentLogId: enrichmentLog.id,
      rawData,
    };
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : 'Unknown error';

    const enrichmentLog = await prisma.enrichmentLog.create({
      data: {
        entityType: 'ARTIST',
        entityId: artistId,
        artistId: artistId,
        operation: 'PREVIEW_ENRICHMENT',
        sources: sourcesAttempted,
        status: EnrichmentStatus.PREVIEW,
        reason: `Preview failed: ${errorMessage}`,
        fieldsEnriched: [],
        errorMessage,
        durationMs: Date.now() - startTime,
        apiCallCount: sourcesAttempted.length,
        triggeredBy: 'admin_preview',
        metadata: {
          artistName: artist.name,
        },
      },
    });

    return {
      success: false,
      message: errorMessage,
      matchScore: null,
      matchedEntity: null,
      sources: sourcesAttempted,
      fieldsToUpdate: [],
      enrichmentLogId: enrichmentLog.id,
      rawData: null,
    };
  }
}
