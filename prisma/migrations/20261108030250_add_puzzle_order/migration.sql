-- AlterTable
ALTER TABLE "puzzles" ADD COLUMN "order" INTEGER;

-- CreateIndex
CREATE INDEX "puzzles_order_idx" ON "puzzles"("order");

-- Keep the current campaign order (it used to be the puzzle id)
UPDATE "puzzles" SET "order" = "id" WHERE "author" IS NULL;
