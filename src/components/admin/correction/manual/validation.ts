import { z } from 'zod';

/**
 * Common release types for dropdown options.
 * Note: Database stores as VARCHAR(50), so any string up to 50 chars is valid.
 */
export const RELEASE_TYPES = [
  'Album',
  'EP',
  'Single',
  'Compilation',
  'Soundtrack',
  'Live',
  'Remix',
  'Other',
] as const;

export type ReleaseType = (typeof RELEASE_TYPES)[number];

/**
 * External ID validation schemas
 */

// MusicBrainz uses standard UUIDs
export const musicbrainzIdSchema = z
  .string()
  .uuid('MusicBrainz ID must be a valid UUID')
  .nullable()
  .optional();

// Spotify IDs are 22-character base62 strings
export const spotifyIdSchema = z
  .string()
  .regex(/^[a-zA-Z0-9]{22}$/, 'Spotify ID must be 22 alphanumeric characters')
  .nullable()
  .optional();

// Discogs IDs are numeric strings
export const discogsIdSchema = z
  .string()
  .regex(/^\d+$/, 'Discogs ID must contain only numbers')
  .nullable()
  .optional();

/**
 * Field validation schemas
 */

// Title is required, max 500 chars
export const titleSchema = z
  .string()
  .min(1, 'Title is required')
  .max(500, 'Title cannot exceed 500 characters');

// At least one artist required
export const artistsSchema = z
  .array(z.string().min(1, 'Artist name cannot be empty'))
  .min(1, 'At least one artist is required');

// Partial date: YYYY, YYYY-MM, or YYYY-MM-DD
export const partialDateSchema = z
  .string()
  .regex(
    /^(\d{4})(-((0[1-9]|1[0-2])(-((0[1-9]|[12]\d|3[01])))?)?)?$/,
    'Date must be in format YYYY, YYYY-MM, or YYYY-MM-DD'
  )
  .nullable()
  .optional();

// Release type accepts any string up to 50 chars (matching Prisma VARCHAR(50))
export const releaseTypeSchema = z
  .string()
  .max(50, 'Release type cannot exceed 50 characters')
  .nullable()
  .optional();

/**
 * Complete manual edit form schema
 */
export const manualEditSchema = z.object({
  title: titleSchema,
  artists: artistsSchema,
  releaseDate: partialDateSchema,
  releaseType: releaseTypeSchema,
  musicbrainzId: musicbrainzIdSchema,
  spotifyId: spotifyIdSchema,
  discogsId: discogsIdSchema,
});

/**
 * Inferred type from schema
 */
export type ManualEditFormData = z.infer<typeof manualEditSchema>;

/**
 * Helper function to validate a single field
 */
export function validateField<T>(
  schema: z.ZodType<T>,
  value: unknown
): { success: true; data: T } | { success: false; error: string } {
  const result = schema.safeParse(value);

  if (result.success) {
    return { success: true, data: result.data };
  }

  // Extract first error message
  const errorMessage = result.error.errors[0]?.message || 'Validation failed';
  return { success: false, error: errorMessage };
}
