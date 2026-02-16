import type {
  CollectionAddActivityInput,
  RecommendationActivityInput,
  FollowActivityInput,
} from './types';

/**
 * Extract the primary artist name from an album's artist associations.
 */
function getPrimaryArtist(
  artists?: Array<{ artist: { name: string } }>
): string | null {
  return artists?.[0]?.artist?.name || null;
}

/**
 * Create a collection_add activity for when an album is added to a collection.
 * Used by both `addAlbumToCollection` and `addAlbumToCollectionWithCreate`.
 */
export async function createCollectionAddActivity(
  input: CollectionAddActivityInput
) {
  const { db, userId, collectionAlbum: ca, collection } = input;

  return db.activity.create({
    data: {
      id: `act-col-${ca.id}`,
      userId,
      type: 'collection_add',
      collectionAlbumId: ca.id,
      metadata: {
        collectionId: collection.id,
        collectionName: collection.name,
        isPublicCollection: collection.isPublic,
        albumId: ca.albumId,
        albumTitle: ca.album.title,
        albumCoverUrl: ca.album.coverArtUrl,
        albumArtist: getPrimaryArtist(ca.album.artists),
        personalRating: ca.personalRating,
      },
      createdAt: ca.addedAt,
    },
  });
}

/**
 * Create a recommendation activity for when a user creates a recommendation.
 */
export async function createRecommendationActivity(
  input: RecommendationActivityInput
) {
  const { db, userId, recommendation: rec } = input;

  return db.activity.create({
    data: {
      id: `act-rec-${rec.id}`,
      userId,
      type: 'recommendation',
      recommendationId: rec.id,
      metadata: {
        score: rec.score,
        basisAlbumId: rec.basisAlbum.id,
        basisAlbumTitle: rec.basisAlbum.title,
        basisAlbumCoverUrl: rec.basisAlbum.coverArtUrl,
        basisAlbumArtist: getPrimaryArtist(rec.basisAlbum.artists),
        recommendedAlbumId: rec.recommendedAlbum.id,
        recommendedAlbumTitle: rec.recommendedAlbum.title,
        recommendedAlbumCoverUrl: rec.recommendedAlbum.coverArtUrl,
        recommendedAlbumArtist: getPrimaryArtist(rec.recommendedAlbum.artists),
      },
      createdAt: rec.createdAt,
    },
  });
}

/**
 * Create a follow activity for when a user follows another user.
 */
export async function createFollowActivity(input: FollowActivityInput) {
  const { db, userId, targetUserId, followCreatedAt } = input;

  return db.activity.create({
    data: {
      id: `act-follow-${userId}-${targetUserId}-${Date.now()}`,
      userId,
      type: 'follow',
      targetUserId,
      metadata: {},
      createdAt: followCreatedAt,
    },
  });
}
