-- CreateTable
CREATE TABLE "uncover_archive_stats" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" TEXT NOT NULL,
    "games_played" INTEGER NOT NULL DEFAULT 0,
    "games_won" INTEGER NOT NULL DEFAULT 0,
    "total_attempts" INTEGER NOT NULL DEFAULT 0,
    "win_distribution" INTEGER[] DEFAULT ARRAY[0, 0, 0, 0, 0, 0]::INTEGER[],
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "uncover_archive_stats_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "uncover_archive_stats_user_id_key" ON "uncover_archive_stats"("user_id");

-- CreateIndex
CREATE INDEX "uncover_archive_stats_user_id_idx" ON "uncover_archive_stats"("user_id");

-- AddForeignKey
ALTER TABLE "uncover_archive_stats" ADD CONSTRAINT "uncover_archive_stats_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
