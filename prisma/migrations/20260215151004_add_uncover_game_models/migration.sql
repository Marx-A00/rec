-- CreateEnum
CREATE TYPE "UncoverSessionStatus" AS ENUM ('IN_PROGRESS', 'WON', 'LOST');

-- CreateTable
CREATE TABLE "uncover_challenges" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "date" DATE NOT NULL,
    "album_id" UUID NOT NULL,
    "max_attempts" INTEGER NOT NULL DEFAULT 6,
    "total_plays" INTEGER NOT NULL DEFAULT 0,
    "total_wins" INTEGER NOT NULL DEFAULT 0,
    "avg_attempts" DOUBLE PRECISION,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "uncover_challenges_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "uncover_sessions" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "challenge_id" UUID NOT NULL,
    "user_id" TEXT,
    "status" "UncoverSessionStatus" NOT NULL DEFAULT 'IN_PROGRESS',
    "attempt_count" INTEGER NOT NULL DEFAULT 0,
    "won" BOOLEAN NOT NULL DEFAULT false,
    "completed_at" TIMESTAMP(3),
    "revealed_hints" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "started_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "uncover_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "uncover_guesses" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "session_id" UUID NOT NULL,
    "guess_number" INTEGER NOT NULL,
    "guessed_album_id" UUID,
    "guessed_text" TEXT,
    "is_correct" BOOLEAN NOT NULL DEFAULT false,
    "guessed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "uncover_guesses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "uncover_player_stats" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" TEXT NOT NULL,
    "games_played" INTEGER NOT NULL DEFAULT 0,
    "games_won" INTEGER NOT NULL DEFAULT 0,
    "total_attempts" INTEGER NOT NULL DEFAULT 0,
    "current_streak" INTEGER NOT NULL DEFAULT 0,
    "max_streak" INTEGER NOT NULL DEFAULT 0,
    "last_played_date" DATE,
    "win_distribution" INTEGER[] DEFAULT ARRAY[0, 0, 0, 0, 0, 0]::INTEGER[],
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "uncover_player_stats_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "uncover_challenges_date_key" ON "uncover_challenges"("date");

-- CreateIndex
CREATE INDEX "uncover_challenges_date_idx" ON "uncover_challenges"("date");

-- CreateIndex
CREATE INDEX "uncover_challenges_album_id_idx" ON "uncover_challenges"("album_id");

-- CreateIndex
CREATE INDEX "uncover_sessions_user_id_idx" ON "uncover_sessions"("user_id");

-- CreateIndex
CREATE INDEX "uncover_sessions_challenge_id_idx" ON "uncover_sessions"("challenge_id");

-- CreateIndex
CREATE INDEX "uncover_sessions_status_idx" ON "uncover_sessions"("status");

-- CreateIndex
CREATE UNIQUE INDEX "uncover_sessions_challenge_id_user_id_key" ON "uncover_sessions"("challenge_id", "user_id");

-- CreateIndex
CREATE INDEX "uncover_guesses_session_id_idx" ON "uncover_guesses"("session_id");

-- CreateIndex
CREATE UNIQUE INDEX "uncover_guesses_session_id_guess_number_key" ON "uncover_guesses"("session_id", "guess_number");

-- CreateIndex
CREATE UNIQUE INDEX "uncover_player_stats_user_id_key" ON "uncover_player_stats"("user_id");

-- CreateIndex
CREATE INDEX "uncover_player_stats_user_id_idx" ON "uncover_player_stats"("user_id");

-- CreateIndex
CREATE INDEX "uncover_player_stats_current_streak_idx" ON "uncover_player_stats"("current_streak" DESC);

-- AddForeignKey
ALTER TABLE "uncover_challenges" ADD CONSTRAINT "uncover_challenges_album_id_fkey" FOREIGN KEY ("album_id") REFERENCES "albums"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "uncover_sessions" ADD CONSTRAINT "uncover_sessions_challenge_id_fkey" FOREIGN KEY ("challenge_id") REFERENCES "uncover_challenges"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "uncover_sessions" ADD CONSTRAINT "uncover_sessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "uncover_guesses" ADD CONSTRAINT "uncover_guesses_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "uncover_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "uncover_guesses" ADD CONSTRAINT "uncover_guesses_guessed_album_id_fkey" FOREIGN KEY ("guessed_album_id") REFERENCES "albums"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "uncover_player_stats" ADD CONSTRAINT "uncover_player_stats_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
