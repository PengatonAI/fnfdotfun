import { NextResponse } from "next/server";
import type { LeaderboardMetric } from "@/lib/leaderboard/types";

export const dynamic = "force-dynamic";

/**
 * GET /api/leaderboards/seasons/[seasonId]/crews
 * 
 * Returns the season leaderboard for crews.
 * 
 * Flow:
 * 1. Parse params: metric, limit, offset, chain
 * 2. Fetch season
 * 3. Fetch season snapshots for that season
 * 4. Fetch all users with trades in season timeframe
 * 5. Fetch trades for all those users (one query)
 * 6. Group trades by userId
 * 7. Compute current PnL via computePnL()
 * 8. Fetch crews with members
 * 9. Compute crew leaderboard using season-crew-engine
 * 10. Rank & paginate
 * 11. Return JSON
 */
export async function GET(
  request: Request,
  { params }: { params: { seasonId: string } }
) {
  try {
    // Dynamic imports to avoid build-time initialization
    const { auth } = await import("@/lib/auth");
    const { prisma } = await import("@/lib/prisma");
    const { computeSeasonCrewLeaderboard } = await import("@/lib/leaderboard/season-crew-engine");
    const { getSeasonTimeWindow } = await import("@/lib/seasons/utils");

    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { seasonId } = params;

    // 1) Parse query params with defaults
    const { searchParams } = new URL(request.url);
    const metricParam = searchParams.get("metric");
    const chainParam = searchParams.get("chain");
    const limitParam = searchParams.get("limit");
    const offsetParam = searchParams.get("offset");

    const metric: LeaderboardMetric =
      (metricParam as LeaderboardMetric) || "realizedPnl";
    const chain: string | undefined = chainParam || undefined;
    const limit = parseInt(limitParam || "50", 10);
    const offset = parseInt(offsetParam || "0", 10);

    // Validate metric
    if (
      !["realizedPnl", "totalPnl", "volume", "winRate"].includes(metric)
    ) {
      return NextResponse.json(
        { error: "Invalid metric parameter" },
        { status: 400 }
      );
    }

    // 2) Fetch season
    const season = await prisma.season.findUnique({
      where: { id: seasonId },
    });

    if (!season) {
      return NextResponse.json(
        { error: "Season not found" },
        { status: 404 }
      );
    }

    // 3) Get season time window
    const { startDate, endDate } = getSeasonTimeWindow(season);

    // 4) Fetch season snapshots for that season
    const snapshots = await prisma.seasonUserSnapshot.findMany({
      where: {
        seasonId,
      },
    });

    // 5) Build trade filter for finding users who have trades in season timeframe
    const tradeFilter: any = {
      timestamp: {
        gte: startDate,
        lte: endDate,
      },
    };
    if (chain) {
      tradeFilter.chain = chain;
    }

    // 6) Fetch users that have trades in this season window
    const maxUsersToRank = 1000;
    const users = await prisma.user.findMany({
      where: {
        trades: {
          some: tradeFilter,
        },
      },
      select: {
        id: true,
      },
      take: maxUsersToRank,
    });

    if (users.length === 0) {
      return NextResponse.json({
        entries: [],
        total: 0,
        limit,
        offset,
      });
    }

    // 7) Get user IDs for batch trade fetching
    const userIds = users.map((user) => user.id);

    // 8) Fetch all trades for those users in one batch query
    // We fetch ALL trades (not just in season timeframe) because computePnL needs
    // full history for accurate FIFO cost basis calculations
    const allTrades = await prisma.trade.findMany({
      where: {
        userId: {
          in: userIds,
        },
      },
      orderBy: {
        timestamp: "asc",
      },
    });

    // 9) Group trades by user ID in memory
    const tradesByUserId: Record<string, typeof allTrades> = {};
    for (const trade of allTrades) {
      if (!tradesByUserId[trade.userId]) {
        tradesByUserId[trade.userId] = [];
      }
      tradesByUserId[trade.userId].push(trade);
    }

    // 10) If tournament, fetch participant crew IDs
    let participantCrewIds: string[] | null = null;
    if (season.isTournament) {
      const crewParticipants = await prisma.tournamentCrewParticipant.findMany({
        where: {
          seasonId,
        },
        select: {
          crewId: true,
        },
      });
      participantCrewIds = crewParticipants.map((p) => p.crewId);
      
      // If no crew participants, return empty result
      if (participantCrewIds.length === 0) {
        return NextResponse.json({
          entries: [],
          total: 0,
          limit,
          offset,
        });
      }
    }

    // 11) Fetch crews with members
    const crewFilter: any = {};
    
    // If tournament, only include participant crews
    if (season.isTournament && participantCrewIds) {
      crewFilter.id = {
        in: participantCrewIds,
      };
    }

    const crews = await prisma.crew.findMany({
      where: crewFilter,
      select: {
        id: true,
        name: true,
        avatarUrl: true,
        members: {
          select: {
            userId: true,
          },
        },
      },
    });

    // 12) Compute crew leaderboard using season-crew-engine
    const allEntries = await computeSeasonCrewLeaderboard({
      season,
      snapshots,
      tradesByUserId,
      crews,
      metric,
    });

    // 13) Compute total count for pagination
    const total = allEntries.length;

    // 14) Apply pagination to the ranked results
    const entries = allEntries.slice(offset, offset + limit);

    // 15) Return JSON response
    return NextResponse.json({
      entries,
      total,
      limit,
      offset,
    });
  } catch (err) {
    console.error("Season crew leaderboard API error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

