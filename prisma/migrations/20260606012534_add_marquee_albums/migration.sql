-- CreateTable
CREATE TABLE "marquee_albums" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "album_id" UUID NOT NULL,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "marquee_albums_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "marquee_albums_album_id_key" ON "marquee_albums"("album_id");

-- CreateIndex
CREATE INDEX "marquee_albums_album_id_idx" ON "marquee_albums"("album_id");

-- CreateIndex
CREATE INDEX "marquee_albums_sort_order_idx" ON "marquee_albums"("sort_order");

-- AddForeignKey
ALTER TABLE "marquee_albums" ADD CONSTRAINT "marquee_albums_album_id_fkey" FOREIGN KEY ("album_id") REFERENCES "albums"("id") ON DELETE CASCADE ON UPDATE CASCADE;
