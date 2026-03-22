-- AlterTable
ALTER TABLE "app_config" ADD COLUMN "listenbrainz_days" INTEGER NOT NULL DEFAULT 14;
ALTER TABLE "app_config" ADD COLUMN "listenbrainz_include_future" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "app_config" ADD COLUMN "listenbrainz_max_releases" INTEGER NOT NULL DEFAULT 50;
ALTER TABLE "app_config" ADD COLUMN "listenbrainz_min_listen_count" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "app_config" ADD COLUMN "listenbrainz_min_artist_listeners" INTEGER NOT NULL DEFAULT 0;
