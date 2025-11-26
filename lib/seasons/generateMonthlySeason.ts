import { prisma } from "@/lib/prisma";

/**
 * Generate a monthly season for the current month.
 * 
 * Computes the first and last day of the current month in UTC,
 * checks if a season already exists, and creates one if it doesn't.
 * 
 * @returns Object with either { alreadyExists: true, season } or { created: true, season }
 */
export async function generateMonthlySeason(): Promise<
  | { alreadyExists: true; season: Awaited<ReturnType<typeof prisma.season.create>> }
  | { created: true; season: Awaited<ReturnType<typeof prisma.season.create>> }
> {
  // Get current date in UTC
  const now = new Date();
  const year = now.getUTCFullYear();
  const month = now.getUTCMonth(); // 0-11

  // Compute first day of the month (00:00:00 UTC)
  const firstDayOfMonth = new Date(Date.UTC(year, month, 1, 0, 0, 0, 0));

  // Compute last day of the month (23:59:59.999 UTC)
  const lastDayOfMonth = new Date(Date.UTC(year, month + 1, 0, 23, 59, 59, 999));

  // Generate season name
  const monthNames = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
  ];
  const monthName = monthNames[month];
  const monthNumber = month + 1; // 1-12
  const seasonName = `Season ${monthNumber} — ${monthName} ${year}`;

  // Check if a season already exists for this month
  const existingSeason = await prisma.season.findFirst({
    where: {
      isTournament: false,
      startAt: {
        gte: firstDayOfMonth,
      },
      endAt: {
        lte: lastDayOfMonth,
      },
    },
  });

  if (existingSeason) {
    return {
      alreadyExists: true,
      season: existingSeason,
    };
  }

  // Create the season
  const season = await prisma.season.create({
    data: {
      name: seasonName,
      startAt: firstDayOfMonth,
      endAt: lastDayOfMonth,
      isTournament: false,
      visibility: "public",
      allowedChains: null,
      allowedUsers: null,
      allowedCrews: null,
    },
  });

  return {
    created: true,
    season,
  };
}

