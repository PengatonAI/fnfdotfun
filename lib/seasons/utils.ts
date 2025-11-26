import { Season, PrismaClient } from "@prisma/client";

/**
 * Check if a season is currently active (current time is between startAt and endAt).
 * 
 * @param season - The Season record to check
 * @returns true if the season is currently active, false otherwise
 */
export function isSeasonActive(season: Season): boolean {
  const now = new Date();
  return now >= season.startAt && now <= season.endAt;
}

/**
 * Get the current active season, if any.
 * 
 * @param prisma - Prisma client instance
 * @returns The current active Season, or null if no season is active
 */
export async function getCurrentSeason(
  prisma: PrismaClient
): Promise<Season | null> {
  const now = new Date();

  const season = await prisma.season.findFirst({
    where: {
      startAt: {
        lte: now,
      },
      endAt: {
        gte: now,
      },
    },
    orderBy: {
      startAt: "desc",
    },
  });

  return season;
}

/**
 * Get the time window (start and end dates) for a season.
 * 
 * @param season - The Season record
 * @returns Object with startDate and endDate
 */
export function getSeasonTimeWindow(season: Season): {
  startDate: Date;
  endDate: Date;
} {
  return {
    startDate: season.startAt,
    endDate: season.endAt,
  };
}

