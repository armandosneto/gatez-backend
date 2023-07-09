-- RedefineTables
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_puzzle_reports" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "puzzleId" INTEGER NOT NULL,
    "reason" TEXT NOT NULL,
    "legit" BOOLEAN NOT NULL DEFAULT false,
    "reviewed" BOOLEAN NOT NULL DEFAULT false,
    "reviewedAt" DATETIME,
    "reviewNotes" TEXT,
    "reviewerId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "puzzle_reports_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "puzzle_reports_reviewerId_fkey" FOREIGN KEY ("reviewerId") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "puzzle_reports_puzzleId_fkey" FOREIGN KEY ("puzzleId") REFERENCES "puzzles" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_puzzle_reports" ("createdAt", "id", "legit", "puzzleId", "reason", "reviewNotes", "reviewed", "reviewedAt", "userId") SELECT "createdAt", "id", "legit", "puzzleId", "reason", "reviewNotes", "reviewed", "reviewedAt", "userId" FROM "puzzle_reports";
DROP TABLE "puzzle_reports";
ALTER TABLE "new_puzzle_reports" RENAME TO "puzzle_reports";
PRAGMA foreign_key_check;
PRAGMA foreign_keys=ON;
