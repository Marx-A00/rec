-- DropIndex
DROP INDEX IF EXISTS "idx_game_album_lookup_title_trgm";
DROP INDEX IF EXISTS "idx_game_album_lookup_artist_trgm";
DROP INDEX IF EXISTS "game_album_lookup_title_artist_name_key";

-- DropTable
DROP TABLE IF EXISTS "game_album_lookup";
