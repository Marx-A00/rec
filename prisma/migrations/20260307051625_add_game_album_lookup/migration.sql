-- Enable pg_trgm extension for trigram-based fuzzy search
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- CreateTable
CREATE TABLE "game_album_lookup" (
    "id" SERIAL NOT NULL,
    "title" TEXT NOT NULL,
    "artist_name" TEXT NOT NULL,
    "score" INTEGER NOT NULL DEFAULT 0,
    "source" TEXT NOT NULL DEFAULT 'musicbrainz',

    CONSTRAINT "game_album_lookup_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "game_album_lookup_title_artist_name_key" ON "game_album_lookup"("title", "artist_name");

-- Trigram GIN indexes for fast fuzzy search
CREATE INDEX "idx_game_album_lookup_title_trgm" ON "game_album_lookup" USING GIN ("title" gin_trgm_ops);
CREATE INDEX "idx_game_album_lookup_artist_trgm" ON "game_album_lookup" USING GIN ("artist_name" gin_trgm_ops);
