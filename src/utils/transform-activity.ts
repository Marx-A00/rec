import type { ActivityFieldsFragment } from '@/generated/graphql';

export interface TransformedActivityMetadata {
  score?: number;
  basisAlbum?: {
    id: string;
    title: string;
    coverArtUrl?: string;
    cloudflareImageId?: string;
    artists?: Array<{ artist?: { name?: string } }>;
  };
  collectionName?: string;
  personalRating?: number;
}

export interface TransformedActivity {
  id: string;
  type: 'follow' | 'recommendation' | 'collection_add' | 'profile_update';
  actorId: string;
  actorName: string;
  actorImage: string | null;
  targetId?: string;
  targetName?: string;
  targetImage?: string | null;
  albumId?: string;
  albumTitle?: string;
  albumArtist?: string;
  artistId?: string;
  albumImage?: string | null;
  albumCloudflareImageId?: string | null;
  createdAt: string;
  metadata?: TransformedActivityMetadata;
}

/**
 * Transform a GraphQL ActivityFieldsFragment into a flat shape
 * expected by feed card components (desktop and mobile).
 */
export function transformActivity(
  activity: ActivityFieldsFragment
): TransformedActivity {
  return {
    id: activity.id,
    type: activity.type
      .toLowerCase()
      .replace('_', '_') as TransformedActivity['type'],
    actorId: activity.actor.id,
    actorName: activity.actor.username || 'Unknown',
    actorImage: activity.actor.image ?? null,
    targetId: activity.targetUser?.id,
    targetName: activity.targetUser?.username ?? undefined,
    targetImage: activity.targetUser?.image ?? null,
    albumId: activity.album?.id,
    albumTitle: activity.album?.title,
    albumArtist: activity.album?.artists?.[0]?.artist?.name,
    artistId: activity.album?.artists?.[0]?.artist?.id,
    albumImage: activity.album?.coverArtUrl ?? null,
    albumCloudflareImageId: activity.album?.cloudflareImageId ?? null,
    createdAt:
      activity.createdAt instanceof Date
        ? activity.createdAt.toISOString()
        : activity.createdAt,
    metadata: activity.metadata
      ? {
          score: activity.metadata.score ?? undefined,
          basisAlbum: activity.metadata.basisAlbum
            ? {
                id: activity.metadata.basisAlbum.id,
                title: activity.metadata.basisAlbum.title,
                coverArtUrl:
                  activity.metadata.basisAlbum.coverArtUrl ?? undefined,
                cloudflareImageId:
                  activity.metadata.basisAlbum.cloudflareImageId ?? undefined,
                artists: activity.metadata.basisAlbum.artists
                  ?.filter((a): a is NonNullable<typeof a> => a != null)
                  .map(a => ({
                    artist: a.artist
                      ? { name: a.artist.name ?? undefined }
                      : undefined,
                  })),
              }
            : undefined,
          collectionName: activity.metadata.collectionName ?? undefined,
          personalRating: activity.metadata.personalRating ?? undefined,
        }
      : undefined,
  };
}
