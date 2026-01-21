-- Backfill Activity table with historical data
-- This migration populates the activities table from existing UserFollow, Recommendation, and CollectionAlbum records

-- Backfill follow activities
INSERT INTO "activities" ("id", "userId", "type", "targetUserId", "metadata", "createdAt")
SELECT 
  'act-follow-' || "followerId" || '-' || "followedId" || '-' || EXTRACT(EPOCH FROM "createdAt")::bigint,
  "followerId",
  'follow',
  "followedId",
  '{}',
  "createdAt"
FROM "user_follows"
ON CONFLICT ("id") DO NOTHING;

-- Backfill recommendation activities with denormalized album data
INSERT INTO "activities" ("id", "userId", "type", "recommendationId", "metadata", "createdAt")
SELECT 
  'act-rec-' || r."id",
  r."userId",
  'recommendation',
  r."id",
  jsonb_build_object(
    'score', r."score",
    'basisAlbumId', r."basis_album_id"::text,
    'basisAlbumTitle', ba."title",
    'basisAlbumCoverUrl', ba."cover_art_url",
    'basisAlbumArtist', (SELECT ar."name" FROM "album_artists" aa JOIN "artists" ar ON aa."artist_id" = ar."id" WHERE aa."album_id" = ba."id" LIMIT 1),
    'recommendedAlbumId', r."recommended_album_id"::text,
    'recommendedAlbumTitle', ra."title",
    'recommendedAlbumCoverUrl', ra."cover_art_url",
    'recommendedAlbumArtist', (SELECT ar."name" FROM "album_artists" aa JOIN "artists" ar ON aa."artist_id" = ar."id" WHERE aa."album_id" = ra."id" LIMIT 1)
  ),
  r."createdAt"
FROM "Recommendation" r
JOIN "albums" ba ON r."basis_album_id" = ba."id"
JOIN "albums" ra ON r."recommended_album_id" = ra."id"
ON CONFLICT ("id") DO NOTHING;

-- Backfill collection_add activities
INSERT INTO "activities" ("id", "userId", "type", "collectionAlbumId", "metadata", "createdAt")
SELECT 
  'act-col-' || ca."id",
  c."userId",
  'collection_add',
  ca."id",
  jsonb_build_object(
    'collectionId', c."id",
    'collectionName', c."name",
    'isPublicCollection', c."isPublic",
    'albumId', ca."album_id"::text,
    'albumTitle', a."title",
    'albumCoverUrl', a."cover_art_url",
    'albumArtist', (SELECT ar."name" FROM "album_artists" aa JOIN "artists" ar ON aa."artist_id" = ar."id" WHERE aa."album_id" = a."id" LIMIT 1),
    'personalRating', ca."personalRating"
  ),
  ca."addedAt"
FROM "CollectionAlbum" ca
JOIN "Collection" c ON ca."collectionId" = c."id"
JOIN "albums" a ON ca."album_id" = a."id"
ON CONFLICT ("id") DO NOTHING;
