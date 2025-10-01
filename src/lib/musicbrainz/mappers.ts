// src/lib/musicbrainz/mappers.ts
import type {
  ValidatedArtistSearchResult,
  ValidatedReleaseGroupSearchResult,
} from './schemas';

/**
 * Mapper functions to transform MusicBrainz search results to canonical database schema
 * These functions convert validated MusicBrainz data to the format expected by Prisma
 */

// Types for database creation (excluding auto-generated fields)
export type CreateArtistData = {
  musicbrainzId: string;
  name: string;
  biography: string | null;
  formedYear: number | null;
  countryCode: string | null;
  imageUrl: string | null;
};

export type CreateAlbumData = {
  musicbrainzId: string;
  title: string;
  releaseDate: Date | null;
  releaseType: string | null;
  trackCount: number | null;
  durationMs: number | null;
  coverArtUrl: string | null;
  barcode: string | null;
  label: string | null;
  catalogNumber: string | null;
};

/**
 * Maps a validated MusicBrainz artist search result to canonical artist data
 */
export function mapArtistSearchToCanonical(
  artist: ValidatedArtistSearchResult
): CreateArtistData {
  return {
    musicbrainzId: artist.id,
    name: artist.name,
    biography: null, // Not available in search results - will be added with full lookups later
    formedYear: parseLifeSpanYear(artist.lifeSpan?.begin),
    countryCode: artist.country || null,
    imageUrl: null, // Not available in search results - will be added later
  };
}

/**
 * Maps a validated MusicBrainz release group search result to canonical album data
 */
export function mapReleaseGroupSearchToCanonical(
  releaseGroup: ValidatedReleaseGroupSearchResult
): CreateAlbumData {
  return {
    musicbrainzId: releaseGroup.id,
    title: releaseGroup.title,
    releaseDate: parseReleaseDate(releaseGroup.firstReleaseDate),
    releaseType: releaseGroup.primaryType || null,
    trackCount: null, // Not available in release group search results
    durationMs: null, // Not available in release group search results
    coverArtUrl: null, // Will be added separately via Cover Art Archive API
    barcode: null, // Not available in search results
    label: null, // Not available in search results
    catalogNumber: null, // Not available in search results
  };
}

/**
 * Extracts artist credits from a release group for creating artist-album relationships
 */
export function extractArtistCreditsFromReleaseGroup(
  releaseGroup: ValidatedReleaseGroupSearchResult
): Array<{ artistId: string; name: string; position: number }> {
  if (!releaseGroup.artistCredit) {
    return [];
  }

  return releaseGroup.artistCredit.map((credit, index) => ({
    artistId: credit.artist.id,
    name: credit.artist.name,
    position: index,
  }));
}

// Utility functions

/**
 * Parses a MusicBrainz life-span begin date to extract the year
 * Handles partial dates like "1988", "1988-03", "1988-03-15"
 */
function parseLifeSpanYear(lifeSpanString?: string): number | null {
  if (!lifeSpanString) return null;

  try {
    const year = parseInt(lifeSpanString.split('-')[0]);
    return isNaN(year) ? null : year;
  } catch {
    return null;
  }
}

/**
 * Parses a MusicBrainz release date string to a Date object
 * Handles partial dates by padding with defaults (01-01 for missing month/day)
 */
function parseReleaseDate(dateString?: string): Date | null {
  if (!dateString) return null;

  try {
    // Handle partial dates by padding with defaults
    const parts = dateString.split('-');

    if (parts.length === 1) {
      // Just year: "1991" -> "1991-01-01"
      return new Date(`${parts[0]}-01-01`);
    } else if (parts.length === 2) {
      // Year and month: "1991-09" -> "1991-09-01"
      return new Date(`${parts[0]}-${parts[1]}-01`);
    } else {
      // Full date: "1991-09-24"
      return new Date(dateString);
    }
  } catch {
    return null;
  }
}

/**
 * Utility function to create a simple artist object from artist credit
 * Used when we need to create an artist record from album artist credits
 */
export function mapArtistCreditToCanonical(artistCredit: {
  artist: { id: string; name: string };
}): CreateArtistData {
  return {
    musicbrainzId: artistCredit.artist.id,
    name: artistCredit.artist.name,
    biography: null,
    formedYear: null,
    countryCode: null,
    imageUrl: null,
  };
}
