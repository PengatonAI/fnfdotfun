/*
  Warnings:

  - A unique constraint covering the columns `[name]` on the table `Crew` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateTable
CREATE TABLE "CrewJoinRequest" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "crewId" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "decidedAt" DATETIME,
    "decidedBy" TEXT,
    CONSTRAINT "CrewJoinRequest_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "CrewJoinRequest_crewId_fkey" FOREIGN KEY ("crewId") REFERENCES "Crew" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "CrewJoinRequest_userId_crewId_status_key" ON "CrewJoinRequest"("userId", "crewId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "Crew_name_key" ON "Crew"("name");
