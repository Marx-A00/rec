import { PrismaClient } from '@prisma/client';
import { ITXClientDenyList } from '@prisma/client/runtime/library';

export type TransactionClient = Omit<PrismaClient, ITXClientDenyList>;
export type DbClient = PrismaClient | TransactionClient;

// ── Input types for each activity factory ──

export interface CollectionAddActivityInput {
  db: DbClient;
  userId: string;
  collectionAlbum: {
    id: string;
    albumId: string;
    personalRating?: number | null;
    addedAt: Date;
    album: {
      title: string;
      coverArtUrl?: string | null;
      artists?: Array<{ artist: { name: string } }>;
    };
  };
  collection: {
    id: string;
    name: string;
    isPublic: boolean;
  };
}

export interface RecommendationActivityInput {
  db: DbClient;
  userId: string;
  recommendation: {
    id: string;
    score: number;
    createdAt: Date;
    basisAlbum: {
      id: string;
      title: string;
      coverArtUrl?: string | null;
      artists?: Array<{ artist: { name: string } }>;
    };
    recommendedAlbum: {
      id: string;
      title: string;
      coverArtUrl?: string | null;
      artists?: Array<{ artist: { name: string } }>;
    };
  };
}

export interface FollowActivityInput {
  db: DbClient;
  userId: string;
  targetUserId: string;
  followCreatedAt: Date;
}
