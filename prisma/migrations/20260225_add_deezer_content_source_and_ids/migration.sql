-- Add DEEZER to ContentSource enum
ALTER TYPE "ContentSource" ADD VALUE IF NOT EXISTS 'DEEZER' BEFORE 'DISCOGS';

-- Add deezerId to artists table
ALTER TABLE "artists" ADD COLUMN IF NOT EXISTS "deezer_id" TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS "artists_deezer_id_key" ON "artists"("deezer_id");

-- Add deezerId to albums table
ALTER TABLE "albums" ADD COLUMN IF NOT EXISTS "deezer_id" TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS "albums_deezer_id_key" ON "albums"("deezer_id");

-- Add deezerId to tracks table
ALTER TABLE "tracks" ADD COLUMN IF NOT EXISTS "deezer_id" TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS "tracks_deezer_id_key" ON "tracks"("deezer_id");
