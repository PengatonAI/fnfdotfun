import { NextResponse } from "next/server";
import type { LeaderboardMetric, Timeframe } from "@/lib/leaderboard/types";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    // Dynamic imports to avoid build-time initialization
    const { auth } = await import("@/lib/auth");
    const { prisma } = await import("@/lib/prisma");
    const { buildUserLeaderboardEntries, getTimeWindow } = await import("@/lib/leaderboard/engine");

    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // 1) Parse query params with defaults
    const { searchParams } = new URL(request.url);
    const metricParam = searchParams.get("metric");
    const timeframeParam = searchParams.get("timeframe");
    const chainParam = searchParams.get("chain");
    const limitParam = searchParams.get("limit");
    const offsetParam = searchParams.get("offset");

    const metric: LeaderboardMetric =
      (metricParam as LeaderboardMetric) || "realizedPnl";
    const timeframe: Timeframe = (timeframeParam as Timeframe) || "all";
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

    // Validate timeframe
    if (!["all", "30d", "7d"].includes(timeframe)) {
      return NextResponse.json(
        { error: "Invalid timeframe parameter" },
        { status: 400 }
      );
    }

    // 2) Determine timeframe dates
    const { startDate, endDate } = getTimeWindow(timeframe);

    // 3) Build trade filter for finding users who have trades in this window
    const tradeFilter: any = {};
    if (startDate || endDate) {
      tradeFilter.timestamp = {};
      if (startDate) {
        tradeFilter.timestamp.gte = startDate;
      }
      if (endDate) {
        tradeFilter.timestamp.lte = endDate;
      }
    }
    if (chain) {
      tradeFilter.chain = chain;
    }

    // 4) Fetch users that have trades in this window
    // For leaderboards, we need to rank ALL users first, then paginate the results
    // So we fetch a reasonable top set (max 1000) of eligible users, rank them, then paginate
    const maxUsersToRank = 1000;
    const users = await prisma.user.findMany({
      where: {
        trades: {
          some: tradeFilter,
        },
      },
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

    // 5) Get user IDs for batch trade fetching
    const userIds = users.map((user) => user.id);

    // 6) Fetch all trades for those users in one batch query
    // We fetch ALL trades (not just in timeframe) because computePnL needs
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

    // 7) Group trades by user ID in memory
    const tradesByUserId: Record<string, typeof allTrades> = {};
    for (const trade of allTrades) {
      if (!tradesByUserId[trade.userId]) {
        tradesByUserId[trade.userId] = [];
      }
      tradesByUserId[trade.userId].push(trade);
    }

    // 8) Build leaderboard entries using the pure engine
    // The engine will filter by timeframe and chain internally and sort by metric
    const allEntries = buildUserLeaderboardEntries(
      users,
      tradesByUserId,
      metric,
      timeframe,
      chain
    );

    // 9) Compute total count for pagination
    // Count users who have trades in the timeframe (with chain filter if provided)
    const total = await prisma.user.count({
      where: {
        trades: {
          some: tradeFilter,
        },
      },
    });

    // 10) Apply pagination to the ranked results
    const entries = allEntries.slice(offset, offset + limit);

    // 11) Return JSON response
    return NextResponse.json({
      entries,
      total,
      limit,
      offset,
    });
  } catch (err) {
    console.error("Leaderboard API error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

