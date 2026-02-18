-- CreateTable
CREATE TABLE "curated_challenges" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "album_id" UUID NOT NULL,
    "sequence" INTEGER NOT NULL,
    "pinned_date" DATE,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "curated_challenges_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "curated_challenges_sequence_key" ON "curated_challenges"("sequence");

-- CreateIndex
CREATE UNIQUE INDEX "curated_challenges_pinned_date_key" ON "curated_challenges"("pinned_date");

-- CreateIndex
CREATE INDEX "curated_challenges_sequence_idx" ON "curated_challenges"("sequence");

-- CreateIndex
CREATE INDEX "curated_challenges_pinned_date_idx" ON "curated_challenges"("pinned_date");

-- CreateIndex
CREATE INDEX "curated_challenges_album_id_idx" ON "curated_challenges"("album_id");

-- AddForeignKey
ALTER TABLE "curated_challenges" ADD CONSTRAINT "curated_challenges_album_id_fkey" FOREIGN KEY ("album_id") REFERENCES "albums"("id") ON DELETE CASCADE ON UPDATE CASCADE;
