/*
  Warnings:

  - You are about to drop the column `discarted` on the `puzzle_translations` table. All the data in the column will be lost.

*/
-- RedefineTables
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_puzzle_translations" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "puzzleId" INTEGER NOT NULL,
    "userId" TEXT,
    "locale" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "approved" BOOLEAN NOT NULL,
    "reviewerId" TEXT,
    "reviewed" BOOLEAN NOT NULL DEFAULT false,
    "reviewedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "puzzle_translations_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "puzzle_translations_reviewerId_fkey" FOREIGN KEY ("reviewerId") REFERENCES "users" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "puzzle_translations_puzzleId_fkey" FOREIGN KEY ("puzzleId") REFERENCES "puzzles" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_puzzle_translations" ("approved", "createdAt", "description", "id", "locale", "puzzleId", "reviewed", "reviewedAt", "reviewerId", "title", "userId") SELECT "approved", "createdAt", "description", "id", "locale", "puzzleId", "reviewed", "reviewedAt", "reviewerId", "title", "userId" FROM "puzzle_translations";
DROP TABLE "puzzle_translations";
ALTER TABLE "new_puzzle_translations" RENAME TO "puzzle_translations";
CREATE UNIQUE INDEX "puzzle_translations_userId_puzzleId_locale_key" ON "puzzle_translations"("userId", "puzzleId", "locale");
PRAGMA foreign_key_check;
PRAGMA foreign_keys=ON;
