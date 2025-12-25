-- AlterTable
ALTER TABLE "enrichment_logs" ADD COLUMN     "user_id" TEXT;

-- CreateIndex
CREATE INDEX "enrichment_logs_user_id_idx" ON "enrichment_logs"("user_id");

-- AddForeignKey
ALTER TABLE "enrichment_logs" ADD CONSTRAINT "enrichment_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
