/*
  Warnings:

  - You are about to drop the column `banned` on the `users` table. All the data in the column will be lost.

*/
-- CreateTable
CREATE TABLE "user_bans" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "moderatorId" TEXT NOT NULL,
    "lifted" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "durationDays" INTEGER NOT NULL,
    CONSTRAINT "user_bans_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "user_bans_moderatorId_fkey" FOREIGN KEY ("moderatorId") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

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
    "userRole" INTEGER NOT NULL DEFAULT 0
);
INSERT INTO "new_users" ("confirmed", "createdAt", "email", "id", "name", "password", "trophies", "userRole") SELECT "confirmed", "createdAt", "email", "id", "name", "password", "trophies", "userRole" FROM "users";
DROP TABLE "users";
ALTER TABLE "new_users" RENAME TO "users";
CREATE UNIQUE INDEX "users_name_key" ON "users"("name");
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");
PRAGMA foreign_key_check;
PRAGMA foreign_keys=ON;
