// src/lib/musicbrainz/schemas.ts
import { z } from 'zod';

/**
 * Zod schemas for validating MusicBrainz API responses
 * These schemas validate the search result formats we get from the musicbrainz-api library
 */

// Base schemas for common MusicBrainz structures
export const MusicBrainzLifeSpanSchema = z.object({
  begin: z.string().optional(),
  end: z.string().optional(),
  ended: z.boolean().nullable().optional(), // Can be true, false, or null
});

export const MusicBrainzArtistCreditSchema = z.object({
  name: z.string(),
  artist: z.object({
    id: z.string().uuid(),
    name: z.string(),
  }),
});

// Artist search result schema (matches your existing ArtistSearchResult interface)
export const MusicBrainzArtistSearchSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  sortName: z.string(),
  disambiguation: z.string().optional(),
  type: z.string().optional(),
  country: z.string().optional(),
  lifeSpan: MusicBrainzLifeSpanSchema.optional(),
  score: z.number(),
});

// Release group search result schema (matches your existing ReleaseGroupSearchResult interface)
export const MusicBrainzReleaseGroupSearchSchema = z.object({
  id: z.string().uuid(),
  title: z.string(),
  disambiguation: z.string().optional(),
  primaryType: z.string().optional(),
  secondaryTypes: z.array(z.string()).optional(),
  firstReleaseDate: z.string().optional(),
  artistCredit: z.array(MusicBrainzArtistCreditSchema).optional(),
  score: z.number(),
});

// Recording search result schema (for future use)
export const MusicBrainzRecordingSearchSchema = z.object({
  id: z.string().uuid(),
  title: z.string(),
  disambiguation: z.string().optional(),
  length: z.number().optional(),
  artistCredit: z.array(MusicBrainzArtistCreditSchema).optional(),
  releases: z.array(z.object({
    id: z.string().uuid(),
    title: z.string(),
  })).optional(),
  score: z.number(),
});

// Type exports for use in other files
export type ValidatedArtistSearchResult = z.infer<typeof MusicBrainzArtistSearchSchema>;
export type ValidatedReleaseGroupSearchResult = z.infer<typeof MusicBrainzReleaseGroupSearchSchema>;
export type ValidatedRecordingSearchResult = z.infer<typeof MusicBrainzRecordingSearchSchema>;

// Validation helper functions
export function validateArtistSearchResult(data: unknown): ValidatedArtistSearchResult {
  return MusicBrainzArtistSearchSchema.parse(data);
}

export function validateReleaseGroupSearchResult(data: unknown): ValidatedReleaseGroupSearchResult {
  return MusicBrainzReleaseGroupSearchSchema.parse(data);
}

export function validateRecordingSearchResult(data: unknown): ValidatedRecordingSearchResult {
  return MusicBrainzRecordingSearchSchema.parse(data);
}

// Safe validation functions (don't throw errors)
export function safeValidateArtistSearchResult(data: unknown) {
  return MusicBrainzArtistSearchSchema.safeParse(data);
}

export function safeValidateReleaseGroupSearchResult(data: unknown) {
  return MusicBrainzReleaseGroupSearchSchema.safeParse(data);
}

export function safeValidateRecordingSearchResult(data: unknown) {
  return MusicBrainzRecordingSearchSchema.safeParse(data);
}
