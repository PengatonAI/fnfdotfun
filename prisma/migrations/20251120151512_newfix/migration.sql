/*
  Warnings:

  - A unique constraint covering the columns `[userId,crewId]` on the table `CrewJoinRequest` will be added. If there are existing duplicate values, this will fail.

*/

-- Step 1: Remove duplicate CrewJoinRequest rows
-- Keep only the most recent row (highest rowid) for each (userId, crewId) pair
DELETE FROM "CrewJoinRequest"
WHERE rowid NOT IN (
    SELECT MAX(rowid)
    FROM "CrewJoinRequest"
    GROUP BY "userId", "crewId"
);

-- Step 2: Drop the old unique constraint if it exists
DROP INDEX IF EXISTS "CrewJoinRequest_userId_crewId_status_key";

-- Step 3: Create the new unique constraint on (userId, crewId)
CREATE UNIQUE INDEX IF NOT EXISTS "CrewJoinRequest_userId_crewId_key" ON "CrewJoinRequest"("userId", "crewId");
