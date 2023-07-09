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
    "durationDays" INTEGER NOT NULL,
    CONSTRAINT "user_bans_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "user_bans_moderatorId_fkey" FOREIGN KEY ("moderatorId") REFERENCES "users" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "user_bans_moderatorId_fkey" FOREIGN KEY ("moderatorId") REFERENCES "users" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_user_bans" ("createdAt", "durationDays", "id", "lifted", "moderatorId", "reason", "userId") SELECT "createdAt", "durationDays", "id", "lifted", "moderatorId", "reason", "userId" FROM "user_bans";
DROP TABLE "user_bans";
ALTER TABLE "new_user_bans" RENAME TO "user_bans";
PRAGMA foreign_key_check;
PRAGMA foreign_keys=ON;
