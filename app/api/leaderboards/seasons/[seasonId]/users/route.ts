import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { computePnL } from "@/lib/pnl/engine";
import { buildSeasonLeaderboardEntries } from "@/lib/leaderboard/season-engine";
import { getSeasonTimeWindow } from "@/lib/seasons/utils";
import { LeaderboardMetric } from "@/lib/leaderboard/types";

/**
 * GET /api/leaderboards/seasons/[seasonId]/users
 * 
 * Returns the season leaderboard for users.
 * 
 * Flow:
 * 1. Parse params: metric, limit, offset, chain
 * 2. Fetch season
 * 3. Fetch season snapshots for that season
 * 4. Fetch all users with trades in season timeframe
 * 5. Fetch trades for all those users (one query)
 * 6. Group trades by userId
 * 7. Compute current PnL via computePnL()
 * 8. Combine current PnL with snapshot values using season-engine.ts
 * 9. Rank & paginate
 * 10. Return JSON
 */
export async function GET(
  request: Request,
  { params }: { params: { seasonId: string } }
) {
  try {
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

    // Create map for quick lookup
    const snapshotsByUserId: Record<string, typeof snapshots[0]> = {};
    for (const snapshot of snapshots) {
      snapshotsByUserId[snapshot.userId] = snapshot;
    }

    // 5) If tournament, fetch participant user IDs
    let participantUserIds: string[] | null = null;
    if (season.isTournament) {
      const participants = await prisma.tournamentParticipant.findMany({
        where: {
          seasonId,
        },
        select: {
          userId: true,
        },
      });
      participantUserIds = participants.map((p) => p.userId);
      
      // If no participants, return empty result
      if (participantUserIds.length === 0) {
        return NextResponse.json({
          entries: [],
          total: 0,
          limit,
          offset,
        });
      }
    }

    // 6) Build trade filter for finding users who have trades in season timeframe
    const tradeFilter: any = {
      timestamp: {
        gte: startDate,
        lte: endDate,
      },
    };
    if (chain) {
      tradeFilter.chain = chain;
    }

    // 7) Build user filter
    const userFilter: any = {
      trades: {
        some: tradeFilter,
      },
    };

    // If tournament, only include participants
    if (season.isTournament && participantUserIds) {
      userFilter.id = {
        in: participantUserIds,
      };
    }

    // 8) Fetch users that have trades in this season window
    const maxUsersToRank = 1000;
    const users = await prisma.user.findMany({
      where: userFilter,
      select: {
        id: true,
        username: true,
        xHandle: true,
        image: true,
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

    // 9) Get user IDs for batch trade fetching
    const userIds = users.map((user) => user.id);

    // 10) Fetch all trades for those users in one batch query
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

    // 11) Group trades by user ID in memory
    const tradesByUserId: Record<string, typeof allTrades> = {};
    for (const trade of allTrades) {
      if (!tradesByUserId[trade.userId]) {
        tradesByUserId[trade.userId] = [];
      }
      tradesByUserId[trade.userId].push(trade);
    }

    // 12) Compute current PnL for each user
    const currentPnLByUserId: Record<string, ReturnType<typeof computePnL>> =
      {};
    for (const userId of userIds) {
      const userTrades = tradesByUserId[userId] || [];
      // Compute PnL with all trades (for accurate FIFO)
      currentPnLByUserId[userId] = computePnL(userTrades, {});
    }

    // 13) Build season leaderboard entries using the season engine
    const allEntries = buildSeasonLeaderboardEntries(
      users,
      currentPnLByUserId,
      snapshotsByUserId,
      metric
    );

    // 14) Compute total count for pagination
    const total = await prisma.user.count({
      where: userFilter,
    });

    // 15) Apply pagination to the ranked results
    const entries = allEntries.slice(offset, offset + limit);

    // 16) Return JSON response
    return NextResponse.json({
      entries,
      total,
      limit,
      offset,
    });
  } catch (err) {
    console.error("Season leaderboard API error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

