-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT NOT NULL,
    "name" TEXT,
    "role" TEXT NOT NULL DEFAULT 'CUSTOMER',
    "phone" TEXT,
    "password" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "specializations" TEXT,
    "marketingOptIn" BOOLEAN NOT NULL DEFAULT false,
    "unsubscribeToken" TEXT
);
INSERT INTO "new_User" ("createdAt", "email", "id", "name", "password", "phone", "role", "specializations", "updatedAt") SELECT "createdAt", "email", "id", "name", "password", "phone", "role", "specializations", "updatedAt" FROM "User";
DROP TABLE "User";
ALTER TABLE "new_User" RENAME TO "User";
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");
CREATE UNIQUE INDEX "User_unsubscribeToken_key" ON "User"("unsubscribeToken");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
