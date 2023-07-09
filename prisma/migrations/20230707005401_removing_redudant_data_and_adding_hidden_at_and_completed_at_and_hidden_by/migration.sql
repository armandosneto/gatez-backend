/*
  Warnings:

  - You are about to drop the column `hidden` on the `puzzles` table. All the data in the column will be lost.
  - You are about to drop the column `reviewed` on the `puzzle_translations` table. All the data in the column will be lost.
  - You are about to drop the column `reviewed` on the `puzzle_reports` table. All the data in the column will be lost.
  - You are about to drop the column `completed` on the `puzzle_complete_data` table. All the data in the column will be lost.
  - You are about to drop the column `lifted` on the `user_bans` table. All the data in the column will be lost.

*/
-- RedefineTables
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_puzzles" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "shortKey" TEXT NOT NULL,
    "likes" INTEGER NOT NULL DEFAULT 0,
    "completions" INTEGER NOT NULL DEFAULT 0,
    "downloads" INTEGER NOT NULL DEFAULT 0,
    "difficulty" REAL,
    "averageTime" REAL,
    "averageDifficultyRating" REAL,
    "title" TEXT NOT NULL,
    "author" TEXT,
    "authorName" TEXT NOT NULL DEFAULT 'official',
    "data" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "afterCompletingMessage" TEXT,
    "minimumComponents" INTEGER NOT NULL,
    "maximumComponents" INTEGER,
    "minimumNands" INTEGER NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "locale" TEXT NOT NULL DEFAULT 'en',
    "hiddenAt" DATETIME,
    "hiddenById" TEXT,
    CONSTRAINT "puzzles_author_fkey" FOREIGN KEY ("author") REFERENCES "users" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "puzzles_hiddenById_fkey" FOREIGN KEY ("hiddenById") REFERENCES "users" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_puzzles" ("afterCompletingMessage", "author", "authorName", "averageDifficultyRating", "averageTime", "completions", "createdAt", "data", "description", "difficulty", "downloads", "id", "likes", "locale", "maximumComponents", "minimumComponents", "minimumNands", "shortKey", "title") SELECT "afterCompletingMessage", "author", "authorName", "averageDifficultyRating", "averageTime", "completions", "createdAt", "data", "description", "difficulty", "downloads", "id", "likes", "locale", "maximumComponents", "minimumComponents", "minimumNands", "shortKey", "title" FROM "puzzles";
DROP TABLE "puzzles";
ALTER TABLE "new_puzzles" RENAME TO "puzzles";
CREATE TABLE "new_puzzle_translations" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "puzzleId" INTEGER NOT NULL,
    "userId" TEXT,
    "locale" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "approved" BOOLEAN NOT NULL,
    "reviewerId" TEXT,
    "reviewedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "puzzle_translations_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "puzzle_translations_reviewerId_fkey" FOREIGN KEY ("reviewerId") REFERENCES "users" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "puzzle_translations_puzzleId_fkey" FOREIGN KEY ("puzzleId") REFERENCES "puzzles" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_puzzle_translations" ("approved", "createdAt", "description", "id", "locale", "puzzleId", "reviewedAt", "reviewerId", "title", "userId") SELECT "approved", "createdAt", "description", "id", "locale", "puzzleId", "reviewedAt", "reviewerId", "title", "userId" FROM "puzzle_translations";
DROP TABLE "puzzle_translations";
ALTER TABLE "new_puzzle_translations" RENAME TO "puzzle_translations";
CREATE UNIQUE INDEX "puzzle_translations_userId_puzzleId_locale_key" ON "puzzle_translations"("userId", "puzzleId", "locale");
CREATE TABLE "new_puzzle_reports" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "puzzleId" INTEGER NOT NULL,
    "reason" TEXT NOT NULL,
    "legit" BOOLEAN NOT NULL DEFAULT false,
    "reviewedAt" DATETIME,
    "reviewNotes" TEXT,
    "reviewerId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "puzzle_reports_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "puzzle_reports_reviewerId_fkey" FOREIGN KEY ("reviewerId") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "puzzle_reports_puzzleId_fkey" FOREIGN KEY ("puzzleId") REFERENCES "puzzles" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_puzzle_reports" ("createdAt", "id", "legit", "puzzleId", "reason", "reviewNotes", "reviewedAt", "reviewerId", "userId") SELECT "createdAt", "id", "legit", "puzzleId", "reason", "reviewNotes", "reviewedAt", "reviewerId", "userId" FROM "puzzle_reports";
DROP TABLE "puzzle_reports";
ALTER TABLE "new_puzzle_reports" RENAME TO "puzzle_reports";
CREATE TABLE "new_puzzle_complete_data" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "puzzleId" INTEGER NOT NULL,
    "timeTaken" INTEGER,
    "componentsUsed" INTEGER,
    "nandsUsed" INTEGER,
    "difficultyRating" INTEGER,
    "completedAt" DATETIME,
    "liked" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "puzzle_complete_data_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "puzzle_complete_data_puzzleId_fkey" FOREIGN KEY ("puzzleId") REFERENCES "puzzles" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_puzzle_complete_data" ("componentsUsed", "createdAt", "difficultyRating", "id", "liked", "nandsUsed", "puzzleId", "timeTaken", "userId") SELECT "componentsUsed", "createdAt", "difficultyRating", "id", "liked", "nandsUsed", "puzzleId", "timeTaken", "userId" FROM "puzzle_complete_data";
DROP TABLE "puzzle_complete_data";
ALTER TABLE "new_puzzle_complete_data" RENAME TO "puzzle_complete_data";
CREATE UNIQUE INDEX "puzzle_complete_data_userId_puzzleId_key" ON "puzzle_complete_data"("userId", "puzzleId");
CREATE TABLE "new_user_bans" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "moderatorId" TEXT,
    "reasonLifted" TEXT,
    "moderatorLiftId" TEXT,
    "liftedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" DATETIME NOT NULL,
    CONSTRAINT "user_bans_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "user_bans_moderatorId_fkey" FOREIGN KEY ("moderatorId") REFERENCES "users" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "user_bans_moderatorLiftId_fkey" FOREIGN KEY ("moderatorLiftId") REFERENCES "users" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_user_bans" ("createdAt", "expiresAt", "id", "liftedAt", "moderatorId", "moderatorLiftId", "reason", "reasonLifted", "userId") SELECT "createdAt", "expiresAt", "id", "liftedAt", "moderatorId", "moderatorLiftId", "reason", "reasonLifted", "userId" FROM "user_bans";
DROP TABLE "user_bans";
ALTER TABLE "new_user_bans" RENAME TO "user_bans";
PRAGMA foreign_key_check;
PRAGMA foreign_keys=ON;
