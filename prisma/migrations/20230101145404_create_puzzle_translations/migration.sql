-- CreateTable
CREATE TABLE "puzzle_translations" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "puzzleId" INTEGER NOT NULL,
    "userId" TEXT,
    "locale" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "approved" BOOLEAN NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "puzzle_translations_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "puzzle_translations_puzzleId_fkey" FOREIGN KEY ("puzzleId") REFERENCES "puzzles" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

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
    CONSTRAINT "puzzles_author_fkey" FOREIGN KEY ("author") REFERENCES "users" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_puzzles" ("afterCompletingMessage", "author", "authorName", "averageDifficultyRating", "averageTime", "completions", "createdAt", "data", "description", "difficulty", "downloads", "id", "likes", "maximumComponents", "minimumComponents", "minimumNands", "shortKey", "title") SELECT "afterCompletingMessage", "author", "authorName", "averageDifficultyRating", "averageTime", "completions", "createdAt", "data", "description", "difficulty", "downloads", "id", "likes", "maximumComponents", "minimumComponents", "minimumNands", "shortKey", "title" FROM "puzzles";
DROP TABLE "puzzles";
ALTER TABLE "new_puzzles" RENAME TO "puzzles";
PRAGMA foreign_key_check;
PRAGMA foreign_keys=ON;

-- CreateIndex
CREATE UNIQUE INDEX "puzzle_translations_userId_puzzleId_locale_key" ON "puzzle_translations"("userId", "puzzleId", "locale");
