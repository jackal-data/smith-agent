-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_ChatSession" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "customerId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "intentScore" REAL NOT NULL DEFAULT 0,
    "summary" TEXT,
    "currentAgent" TEXT NOT NULL DEFAULT 'SCOUT',
    "handoffTriggered" BOOLEAN NOT NULL DEFAULT false,
    "handoffAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "ChatSession_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_ChatSession" ("createdAt", "customerId", "handoffAt", "handoffTriggered", "id", "intentScore", "status", "summary", "updatedAt") SELECT "createdAt", "customerId", "handoffAt", "handoffTriggered", "id", "intentScore", "status", "summary", "updatedAt" FROM "ChatSession";
DROP TABLE "ChatSession";
ALTER TABLE "new_ChatSession" RENAME TO "ChatSession";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
