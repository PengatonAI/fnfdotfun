import { PrismaClient, Challenge, Trade } from "@prisma/client";
import { computePnL } from "@/lib/pnl/engine";
import { filterTrades } from "@/lib/leaderboard/engine";

/**
 * Challenge with crews and members included for finalization
 */
interface ChallengeWithCrews extends Challenge {
  fromCrew: {
    id: string;
    name: string;
    members: { userId: string }[];
  };
  toCrew: {
    id: string;
    name: string;
    members: { userId: string }[];
  };
}

/**
 * Result of crew PnL calculation
 */
interface CrewPnLResult {
  crewId: string;
  crewName: string;
  totalPnL: number;
  memberCount: number;
}

/**
 * Calculate crew's total PnL for a challenge time window.
 * 
 * @param prisma - Prisma client instance
 * @param crewId - The crew ID
 * @param memberUserIds - Array of user IDs for crew members
 * @param startAt - Challenge start time
 * @param endAt - Challenge end time
 * @returns Total PnL for the crew
 */
async function calculateCrewPnL(
  prisma: PrismaClient,
  crewId: string,
  crewName: string,
  memberUserIds: string[],
  startAt: Date,
  endAt: Date
): Promise<CrewPnLResult> {
  // Get all trades for all members
  const allTrades = await prisma.trade.findMany({
    where: {
      userId: { in: memberUserIds },
    },
    orderBy: { timestamp: "asc" },
  });

  // Filter trades to only those within the challenge time window
  const filteredTrades = filterTrades(allTrades, {
    startDate: startAt,
    endDate: endAt,
  });

  // Compute PnL for filtered trades
  const pnlResult = computePnL(filteredTrades, {});

  return {
    crewId,
    crewName,
    totalPnL: pnlResult.realizedPnL, // Use realized PnL for fair comparison
    memberCount: memberUserIds.length,
  };
}

/**
 * Determine the winner between two crews based on their PnL.
 * 
 * @param fromCrewPnL - PnL result for the challenger crew
 * @param toCrewPnL - PnL result for the challenged crew
 * @returns Winner crew ID, or null if it's a draw
 */
function determineWinner(
  fromCrewPnL: CrewPnLResult,
  toCrewPnL: CrewPnLResult
): string | null {
  // Higher PnL wins
  if (fromCrewPnL.totalPnL > toCrewPnL.totalPnL) {
    return fromCrewPnL.crewId;
  } else if (toCrewPnL.totalPnL > fromCrewPnL.totalPnL) {
    return toCrewPnL.crewId;
  }
  // Tie = draw (null winner)
  return null;
}

/**
 * Finalize a single challenge by calculating PnL and determining winner.
 * 
 * This function:
 * 1. Loads both crews with their members
 * 2. Fetches all trades for members within the challenge time window
 * 3. Computes total PnL for each crew
 * 4. Determines the winner (higher PnL wins, tie = draw)
 * 5. Updates the challenge status to "completed" with the winner
 * 
 * @param prisma - Prisma client instance
 * @param challenge - The challenge to finalize (must include fromCrew and toCrew with members)
 * @returns The updated challenge
 */
export async function finalizeChallenge(
  prisma: PrismaClient,
  challenge: ChallengeWithCrews
): Promise<Challenge> {
  // Validate challenge has required time data
  if (!challenge.startAt || !challenge.endAt) {
    throw new Error("Challenge missing start or end time");
  }

  const startAt = new Date(challenge.startAt);
  const endAt = new Date(challenge.endAt);

  // Get member IDs for each crew
  const fromCrewMemberIds = challenge.fromCrew.members.map((m) => m.userId);
  const toCrewMemberIds = challenge.toCrew.members.map((m) => m.userId);

  // Calculate PnL for each crew
  const [fromCrewPnL, toCrewPnL] = await Promise.all([
    calculateCrewPnL(
      prisma,
      challenge.fromCrew.id,
      challenge.fromCrew.name,
      fromCrewMemberIds,
      startAt,
      endAt
    ),
    calculateCrewPnL(
      prisma,
      challenge.toCrew.id,
      challenge.toCrew.name,
      toCrewMemberIds,
      startAt,
      endAt
    ),
  ]);

  // Determine winner
  const winnerCrewId = determineWinner(fromCrewPnL, toCrewPnL);

  // Update challenge to completed
  const updatedChallenge = await prisma.challenge.update({
    where: { id: challenge.id },
    data: {
      status: "completed",
      winnerCrewId,
      updatedAt: new Date(),
    },
  });

  console.log(
    `✅ Challenge ${challenge.id} finalized: ` +
    `${challenge.fromCrew.name} (${fromCrewPnL.totalPnL.toFixed(2)}) vs ` +
    `${challenge.toCrew.name} (${toCrewPnL.totalPnL.toFixed(2)}) - ` +
    `Winner: ${winnerCrewId ? (winnerCrewId === challenge.fromCrew.id ? challenge.fromCrew.name : challenge.toCrew.name) : "Draw"}`
  );

  return updatedChallenge;
}

/**
 * Find and finalize all overdue active challenges.
 * 
 * This function queries for all challenges where:
 * - status = "active"
 * - endAt < now
 * 
 * Then finalizes each one.
 * 
 * @param prisma - Prisma client instance
 * @returns Number of challenges finalized
 */
export async function finalizeOverdueChallenges(
  prisma: PrismaClient
): Promise<number> {
  const now = new Date();

  // Find all overdue active challenges
  const overdueChallenges = await prisma.challenge.findMany({
    where: {
      status: "active",
      endAt: {
        lt: now,
      },
    },
    include: {
      fromCrew: {
        select: {
          id: true,
          name: true,
          members: {
            select: {
              userId: true,
            },
          },
        },
      },
      toCrew: {
        select: {
          id: true,
          name: true,
          members: {
            select: {
              userId: true,
            },
          },
        },
      },
    },
  });

  if (overdueChallenges.length === 0) {
    return 0;
  }

  console.log(`🔄 Finalizing ${overdueChallenges.length} overdue challenge(s)...`);

  // Finalize each challenge
  for (const challenge of overdueChallenges) {
    try {
      await finalizeChallenge(prisma, challenge);
    } catch (error) {
      console.error(`Error finalizing challenge ${challenge.id}:`, error);
      // Continue with other challenges even if one fails
    }
  }

  return overdueChallenges.length;
}

/**
 * Check if a challenge is overdue and should be finalized.
 * 
 * @param challenge - The challenge to check
 * @returns true if the challenge should be finalized
 */
export function isChallengeOverdue(challenge: {
  status: string;
  endAt: Date | string | null;
}): boolean {
  if (challenge.status !== "active" || !challenge.endAt) {
    return false;
  }

  const endAt = challenge.endAt instanceof Date 
    ? challenge.endAt 
    : new Date(challenge.endAt);
  
  return endAt < new Date();
}

