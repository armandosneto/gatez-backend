-- RedefineTables
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_users" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "confirmed" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "trophies" INTEGER NOT NULL DEFAULT 0,
    "userRole" INTEGER NOT NULL DEFAULT 0,
    "banned" BOOLEAN NOT NULL DEFAULT false
);
INSERT INTO "new_users" ("confirmed", "createdAt", "email", "id", "name", "password", "trophies") SELECT "confirmed", "createdAt", "email", "id", "name", "password", "trophies" FROM "users";
DROP TABLE "users";
ALTER TABLE "new_users" RENAME TO "users";
CREATE UNIQUE INDEX "users_name_key" ON "users"("name");
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");
CREATE TABLE "new_puzzle_reports" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "puzzleId" INTEGER NOT NULL,
    "reason" TEXT NOT NULL,
    "legit" BOOLEAN NOT NULL DEFAULT false,
    "reviewed" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "puzzle_reports_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "puzzle_reports_puzzleId_fkey" FOREIGN KEY ("puzzleId") REFERENCES "puzzles" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_puzzle_reports" ("createdAt", "id", "puzzleId", "reason", "userId") SELECT "createdAt", "id", "puzzleId", "reason", "userId" FROM "puzzle_reports";
DROP TABLE "puzzle_reports";
ALTER TABLE "new_puzzle_reports" RENAME TO "puzzle_reports";
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
    "hidden" BOOLEAN NOT NULL DEFAULT false,
    CONSTRAINT "puzzles_author_fkey" FOREIGN KEY ("author") REFERENCES "users" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_puzzles" ("afterCompletingMessage", "author", "authorName", "averageDifficultyRating", "averageTime", "completions", "createdAt", "data", "description", "difficulty", "downloads", "id", "likes", "locale", "maximumComponents", "minimumComponents", "minimumNands", "shortKey", "title") SELECT "afterCompletingMessage", "author", "authorName", "averageDifficultyRating", "averageTime", "completions", "createdAt", "data", "description", "difficulty", "downloads", "id", "likes", "locale", "maximumComponents", "minimumComponents", "minimumNands", "shortKey", "title" FROM "puzzles";
DROP TABLE "puzzles";
ALTER TABLE "new_puzzles" RENAME TO "puzzles";
PRAGMA foreign_key_check;
PRAGMA foreign_keys=ON;
