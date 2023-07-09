/*
  Warnings:

  - You are about to drop the column `durationDays` on the `user_bans` table. All the data in the column will be lost.
  - Added the required column `expiresAt` to the `user_bans` table without a default value. This is not possible if the table is not empty.

*/
-- RedefineTables
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_user_bans" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "moderatorId" TEXT,
    "lifted" BOOLEAN NOT NULL DEFAULT false,
    "reasonLifted" TEXT,
    "moderatorLiftId" TEXT,
    "liftedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" DATETIME NOT NULL,
    CONSTRAINT "user_bans_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "user_bans_moderatorId_fkey" FOREIGN KEY ("moderatorId") REFERENCES "users" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "user_bans_moderatorId_fkey" FOREIGN KEY ("moderatorId") REFERENCES "users" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_user_bans" ("createdAt", "id", "lifted", "liftedAt", "moderatorId", "moderatorLiftId", "reason", "reasonLifted", "userId") SELECT "createdAt", "id", "lifted", "liftedAt", "moderatorId", "moderatorLiftId", "reason", "reasonLifted", "userId" FROM "user_bans";
DROP TABLE "user_bans";
ALTER TABLE "new_user_bans" RENAME TO "user_bans";
PRAGMA foreign_key_check;
PRAGMA foreign_keys=ON;
