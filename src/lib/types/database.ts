// src/lib/types/database.ts
// Database type definitions for GraphQL code generation mapping
// Use actual Prisma-generated types for accurate field mapping

import type {
  PrismaClient,
  Artist as PrismaArtist,
  Album as PrismaAlbum,
  Track as PrismaTrack,
  User as PrismaUser,
  Collection as PrismaCollection,
} from '@prisma/client';

// Re-export Prisma types for GraphQL mappers (these match actual DB schema)
export type Artist = PrismaArtist;
export type Album = PrismaAlbum;
export type Track = PrismaTrack;
export type User = PrismaUser;
export type Collection = PrismaCollection;

// Custom types for audio features (computed from track data)
export type AudioFeatures = {
  energy: number | null;
  valence: number | null;
  danceability: number | null;
  tempo: number | null;
  acousticness: number | null;
  instrumentalness: number | null;
  liveness: number | null;
  loudness: number | null;
  speechiness: number | null;
  key: number | null;
  mode: number | null;
  timeSignature: number | null;
};

// Database client type for context
export type DatabaseClient = PrismaClient;
