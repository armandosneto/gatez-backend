/*
  Warnings:

  - You are about to drop the column `game` on the `puzzles` table. All the data in the column will be lost.
  - Added the required column `data` to the `puzzles` table without a default value. This is not possible if the table is not empty.

*/
-- RedefineTables
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_puzzles" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "short_key" TEXT NOT NULL,
    "likes" INTEGER NOT NULL DEFAULT 0,
    "downloads" INTEGER NOT NULL DEFAULT 0,
    "completions" INTEGER NOT NULL DEFAULT 0,
    "difficulty" INTEGER,
    "average_time" INTEGER,
    "title" TEXT NOT NULL,
    "author" TEXT NOT NULL,
    "completed" BOOLEAN NOT NULL DEFAULT false,
    "data" TEXT NOT NULL,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "puzzles_author_fkey" FOREIGN KEY ("author") REFERENCES "users" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_puzzles" ("author", "average_time", "completed", "completions", "created_at", "difficulty", "downloads", "id", "likes", "short_key", "title") SELECT "author", "average_time", "completed", "completions", "created_at", "difficulty", "downloads", "id", "likes", "short_key", "title" FROM "puzzles";
DROP TABLE "puzzles";
ALTER TABLE "new_puzzles" RENAME TO "puzzles";
PRAGMA foreign_key_check;
PRAGMA foreign_keys=ON;
