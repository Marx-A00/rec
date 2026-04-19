-- RenameEnumValue
ALTER TYPE "EnrichmentStatus" RENAME VALUE 'PENDING' TO 'UNENRICHED';

-- Update default values
ALTER TABLE "albums" ALTER COLUMN "enrichment_status" SET DEFAULT 'UNENRICHED'::"EnrichmentStatus";
ALTER TABLE "artists" ALTER COLUMN "enrichment_status" SET DEFAULT 'UNENRICHED'::"EnrichmentStatus";
ALTER TABLE "tracks" ALTER COLUMN "enrichment_status" SET DEFAULT 'UNENRICHED'::"EnrichmentStatus";
