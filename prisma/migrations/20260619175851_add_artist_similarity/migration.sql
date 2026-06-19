-- CreateTable
CREATE TABLE "artist_similarities" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "seed_artist_id" UUID NOT NULL,
    "similar_artist_id" UUID,
    "similar_mbid" UUID NOT NULL,
    "similar_name" TEXT NOT NULL,
    "similarity" DOUBLE PRECISION NOT NULL,
    "source" TEXT NOT NULL,
    "last_synced" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "artist_similarities_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "artist_similarities_seed_artist_id_idx" ON "artist_similarities"("seed_artist_id");

-- CreateIndex
CREATE INDEX "artist_similarities_similar_mbid_idx" ON "artist_similarities"("similar_mbid");

-- CreateIndex
CREATE UNIQUE INDEX "artist_similarities_seed_artist_id_similar_mbid_key" ON "artist_similarities"("seed_artist_id", "similar_mbid");

-- AddForeignKey
ALTER TABLE "artist_similarities" ADD CONSTRAINT "artist_similarities_seed_artist_id_fkey" FOREIGN KEY ("seed_artist_id") REFERENCES "artists"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "artist_similarities" ADD CONSTRAINT "artist_similarities_similar_artist_id_fkey" FOREIGN KEY ("similar_artist_id") REFERENCES "artists"("id") ON DELETE SET NULL ON UPDATE CASCADE;
