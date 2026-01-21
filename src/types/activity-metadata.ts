/**
 * TypeScript interfaces for Activity metadata JSON field
 * Ensures type safety when creating and reading Activity records
 */

export interface BaseActivityMetadata {
  [key: string]: unknown;
}

/**
 * Metadata for follow activities
 * Currently minimal but can be extended in the future
 */
export type FollowActivityMetadata = BaseActivityMetadata;

/**
 * Metadata for recommendation activities
 * Contains denormalized album data for fast feed queries
 */
export interface RecommendationActivityMetadata extends BaseActivityMetadata {
  score: number;
  basisAlbumId: string;
  basisAlbumTitle: string;
  basisAlbumCoverUrl: string | null;
  basisAlbumArtist: string | null;
  recommendedAlbumId: string;
  recommendedAlbumTitle: string;
  recommendedAlbumCoverUrl: string | null;
  recommendedAlbumArtist: string | null;
}

/**
 * Metadata for collection_add activities
 * Contains denormalized collection and album data
 */
export interface CollectionAddActivityMetadata extends BaseActivityMetadata {
  collectionId: string;
  collectionName: string;
  isPublicCollection: boolean;
  albumId: string;
  albumTitle: string;
  albumCoverUrl: string | null;
  albumArtist: string | null;
  personalRating: number | null;
}

/**
 * Metadata for collection_remove activities (for future use)
 */
export interface CollectionRemoveActivityMetadata extends BaseActivityMetadata {
  collectionId: string;
  collectionName: string;
  albumId: string;
  albumTitle: string;
}

/**
 * Union type of all possible activity metadata types
 */
export type ActivityMetadata =
  | FollowActivityMetadata
  | RecommendationActivityMetadata
  | CollectionAddActivityMetadata
  | CollectionRemoveActivityMetadata;

/**
 * Activity type constants matching database values
 */
export const ACTIVITY_TYPES = {
  FOLLOW: 'follow',
  RECOMMENDATION: 'recommendation',
  COLLECTION_ADD: 'collection_add',
  COLLECTION_REMOVE: 'collection_remove',
} as const;

export type ActivityType = (typeof ACTIVITY_TYPES)[keyof typeof ACTIVITY_TYPES];

// Type guard functions

/**
 * Check if metadata is for a recommendation activity
 */
export function isRecommendationMetadata(
  metadata: unknown
): metadata is RecommendationActivityMetadata {
  return (
    typeof metadata === 'object' &&
    metadata !== null &&
    'score' in metadata &&
    'basisAlbumId' in metadata &&
    'recommendedAlbumId' in metadata
  );
}

/**
 * Check if metadata is for a collection_add activity
 */
export function isCollectionAddMetadata(
  metadata: unknown
): metadata is CollectionAddActivityMetadata {
  return (
    typeof metadata === 'object' &&
    metadata !== null &&
    'collectionId' in metadata &&
    'albumId' in metadata &&
    'collectionName' in metadata
  );
}

/**
 * Check if metadata is for a collection_remove activity
 */
export function isCollectionRemoveMetadata(
  metadata: unknown
): metadata is CollectionRemoveActivityMetadata {
  return (
    typeof metadata === 'object' &&
    metadata !== null &&
    'collectionId' in metadata &&
    'albumId' in metadata &&
    !('isPublicCollection' in metadata) // Distinguishes from CollectionAddActivityMetadata
  );
}

/**
 * Check if metadata is for a follow activity (empty object)
 */
export function isFollowMetadata(
  metadata: unknown
): metadata is FollowActivityMetadata {
  return (
    typeof metadata === 'object' &&
    metadata !== null &&
    !isRecommendationMetadata(metadata) &&
    !isCollectionAddMetadata(metadata) &&
    !isCollectionRemoveMetadata(metadata)
  );
}
