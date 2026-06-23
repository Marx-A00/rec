-- CreateTable
CREATE TABLE "taste_matches" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "matchedUserId" TEXT NOT NULL,
    "score" INTEGER NOT NULL,
    "sharedContext" JSONB NOT NULL,
    "computedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "taste_matches_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "taste_matches_userId_idx" ON "taste_matches"("userId");

-- CreateIndex
CREATE INDEX "taste_matches_matchedUserId_idx" ON "taste_matches"("matchedUserId");

-- CreateIndex
CREATE UNIQUE INDEX "taste_matches_userId_matchedUserId_key" ON "taste_matches"("userId", "matchedUserId");

-- AddForeignKey
ALTER TABLE "taste_matches" ADD CONSTRAINT "taste_matches_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "taste_matches" ADD CONSTRAINT "taste_matches_matchedUserId_fkey" FOREIGN KEY ("matchedUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
