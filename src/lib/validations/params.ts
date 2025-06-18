import { z } from 'zod';

// Base ID validation
const baseIdSchema = z
  .string()
  .min(1, 'ID cannot be empty')
  .refine(id => /^[a-zA-Z0-9\-_]+$/.test(id), {
    message: 'ID must contain only letters, numbers, hyphens, and underscores',
  });

// Album ID validation (typically numeric for Discogs)
export const albumIdSchema = baseIdSchema.refine(
  id => /^\d+$/.test(id) || /^[a-zA-Z0-9\-_]+$/.test(id),
  { message: 'Album ID must be numeric or alphanumeric' }
);

// Artist ID validation (typically numeric for Discogs)
export const artistIdSchema = baseIdSchema.refine(
  id => /^\d+$/.test(id) || /^[a-zA-Z0-9\-_]+$/.test(id),
  { message: 'Artist ID must be numeric or alphanumeric' }
);

// User ID validation
export const userIdSchema = z
  .string()
  .refine(id => /^[a-zA-Z0-9\-_]+$/.test(id), {
    message: 'User ID must be alphanumeric',
  });

// Collection ID validation
export const collectionIdSchema = z
  .string()
  .refine(id => /^[a-zA-Z0-9\-_]+$/.test(id), {
    message: 'Collection ID must be alphanumeric',
  });

// Combined param schemas for pages
export const albumParamsSchema = z.object({
  id: albumIdSchema,
});

export const artistParamsSchema = z.object({
  id: artistIdSchema,
});

export const userProfileParamsSchema = z.object({
  userId: userIdSchema,
});

export const collectionParamsSchema = z.object({
  id: collectionIdSchema,
});

// Type exports
export type AlbumParams = z.infer<typeof albumParamsSchema>;
export type ArtistParams = z.infer<typeof artistParamsSchema>;
export type UserProfileParams = z.infer<typeof userProfileParamsSchema>;
export type CollectionParams = z.infer<typeof collectionParamsSchema>;

// Utility function to validate and parse params
export function validateParams<T>(
  schema: z.ZodSchema<T>,
  params: unknown
): { success: true; data: T } | { success: false; error: string } {
  try {
    const data = schema.parse(params);
    return { success: true, data };
  } catch (error) {
    if (error instanceof z.ZodError) {
      const errorMessage = error.errors.map(e => e.message).join(', ');
      return { success: false, error: errorMessage };
    }
    return { success: false, error: 'Invalid parameters' };
  }
}
