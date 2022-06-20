-- CreateTable
CREATE TABLE "puzzles" (
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
    "game" TEXT NOT NULL,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "puzzles_author_fkey" FOREIGN KEY ("author") REFERENCES "users" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
