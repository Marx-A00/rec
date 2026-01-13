-- AlterEnum
ALTER TYPE "EnrichmentStatus" ADD VALUE 'PREVIEW';

-- AlterTable
ALTER TABLE "enrichment_logs" ADD COLUMN     "preview_data" JSONB;
