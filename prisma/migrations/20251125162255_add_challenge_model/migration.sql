-- AlterTable
ALTER TABLE "Trade" ADD COLUMN "nativePrice" REAL;
ALTER TABLE "Trade" ADD COLUMN "usdPricePerToken" REAL;
ALTER TABLE "Trade" ADD COLUMN "usdValue" REAL;

-- CreateTable
CREATE TABLE "Season" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "startAt" DATETIME NOT NULL,
    "endAt" DATETIME NOT NULL,
    "isTournament" BOOLEAN NOT NULL DEFAULT false,
    "createdBy" TEXT,
    "visibility" TEXT,
    "allowedChains" TEXT,
    "allowedUsers" TEXT,
    "allowedCrews" TEXT,
    "rules" TEXT,
    "description" TEXT,
    "allowUserJoin" BOOLEAN DEFAULT true,
    "allowCrewJoin" BOOLEAN DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "SeasonUserSnapshot" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "seasonId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "realizedPnl" REAL NOT NULL DEFAULT 0,
    "totalPnl" REAL NOT NULL DEFAULT 0,
    "volume" REAL NOT NULL DEFAULT 0,
    "totalTrades" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "SeasonUserSnapshot_seasonId_fkey" FOREIGN KEY ("seasonId") REFERENCES "Season" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "SeasonUserSnapshot_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "TournamentParticipant" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "seasonId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "TournamentParticipant_seasonId_fkey" FOREIGN KEY ("seasonId") REFERENCES "Season" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "TournamentParticipant_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "TournamentCrewParticipant" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "seasonId" TEXT NOT NULL,
    "crewId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "TournamentCrewParticipant_seasonId_fkey" FOREIGN KEY ("seasonId") REFERENCES "Season" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "TournamentCrewParticipant_crewId_fkey" FOREIGN KEY ("crewId") REFERENCES "Crew" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Challenge" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "fromCrewId" TEXT NOT NULL,
    "toCrewId" TEXT NOT NULL,
    "createdById" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "type" TEXT NOT NULL DEFAULT 'pnl',
    "durationHours" INTEGER NOT NULL,
    "visibility" TEXT NOT NULL DEFAULT 'public',
    "rules" TEXT,
    "startAt" DATETIME,
    "endAt" DATETIME,
    "decidedAt" DATETIME,
    "decidedById" TEXT,
    "winnerCrewId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Challenge_fromCrewId_fkey" FOREIGN KEY ("fromCrewId") REFERENCES "Crew" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Challenge_toCrewId_fkey" FOREIGN KEY ("toCrewId") REFERENCES "Crew" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Challenge_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Challenge_decidedById_fkey" FOREIGN KEY ("decidedById") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Challenge_winnerCrewId_fkey" FOREIGN KEY ("winnerCrewId") REFERENCES "Crew" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "SeasonUserSnapshot_userId_idx" ON "SeasonUserSnapshot"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "SeasonUserSnapshot_seasonId_userId_key" ON "SeasonUserSnapshot"("seasonId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "TournamentParticipant_seasonId_userId_key" ON "TournamentParticipant"("seasonId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "TournamentCrewParticipant_seasonId_crewId_key" ON "TournamentCrewParticipant"("seasonId", "crewId");

-- CreateIndex
CREATE INDEX "Challenge_fromCrewId_idx" ON "Challenge"("fromCrewId");

-- CreateIndex
CREATE INDEX "Challenge_toCrewId_idx" ON "Challenge"("toCrewId");

-- CreateIndex
CREATE INDEX "Challenge_status_idx" ON "Challenge"("status");
