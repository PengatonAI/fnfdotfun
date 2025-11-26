-- CreateTable
CREATE TABLE "UserCardSettings" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "theme" TEXT NOT NULL DEFAULT 'default',
    "showAvatar" BOOLEAN NOT NULL DEFAULT true,
    "showUsername" BOOLEAN NOT NULL DEFAULT true,
    "showPnl" BOOLEAN NOT NULL DEFAULT true,
    "showVolume" BOOLEAN NOT NULL DEFAULT true,
    "showWinRate" BOOLEAN NOT NULL DEFAULT true,
    "showTotalTrades" BOOLEAN NOT NULL DEFAULT true,
    "backgroundColor" TEXT,
    "accentColor" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "UserCardSettings_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "CrewCardSettings" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "crewId" TEXT NOT NULL,
    "theme" TEXT NOT NULL DEFAULT 'default',
    "showAvatar" BOOLEAN NOT NULL DEFAULT true,
    "showName" BOOLEAN NOT NULL DEFAULT true,
    "showPnl" BOOLEAN NOT NULL DEFAULT true,
    "showVolume" BOOLEAN NOT NULL DEFAULT true,
    "showMemberCount" BOOLEAN NOT NULL DEFAULT true,
    "showTotalTrades" BOOLEAN NOT NULL DEFAULT true,
    "backgroundColor" TEXT,
    "accentColor" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "CrewCardSettings_crewId_fkey" FOREIGN KEY ("crewId") REFERENCES "Crew" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "SharedCard" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "shareToken" TEXT NOT NULL,
    "cardType" TEXT NOT NULL,
    "userId" TEXT,
    "crewId" TEXT,
    "snapshotData" TEXT NOT NULL,
    "timeframe" TEXT,
    "seasonId" TEXT,
    "expiresAt" DATETIME,
    "viewCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "SharedCard_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "SharedCard_crewId_fkey" FOREIGN KEY ("crewId") REFERENCES "Crew" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "UserCardSettings_userId_key" ON "UserCardSettings"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "CrewCardSettings_crewId_key" ON "CrewCardSettings"("crewId");

-- CreateIndex
CREATE UNIQUE INDEX "SharedCard_shareToken_key" ON "SharedCard"("shareToken");

-- CreateIndex
CREATE INDEX "SharedCard_userId_idx" ON "SharedCard"("userId");

-- CreateIndex
CREATE INDEX "SharedCard_crewId_idx" ON "SharedCard"("crewId");

-- CreateIndex
CREATE INDEX "SharedCard_shareToken_idx" ON "SharedCard"("shareToken");
