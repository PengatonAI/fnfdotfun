import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  buildCrewLeaderboardEntries,
  CrewLeaderboardMetric,
} from "@/lib/leaderboard/crew-engine";
import { Timeframe } from "@/lib/leaderboard/types";
import { getTimeWindow } from "@/lib/leaderboard/engine";

export async function GET(request: Request) {
  try {
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

    const metric: CrewLeaderboardMetric =
      (metricParam as CrewLeaderboardMetric) || "realizedPnl";
    const timeframe: Timeframe = (timeframeParam as Timeframe) || "all";
    const chain: string | undefined = chainParam || undefined;
    const limit = parseInt(limitParam || "50", 10);
    const offset = parseInt(offsetParam || "0", 10);

    // Validate metric
    if (
      !["realizedPnl", "totalPnl", "volume", "avgWinRate"].includes(metric)
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

    // 3) Build trade filter for finding crews whose members have trades in this window
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

    // 4) Fetch up to 500 crews with id, name, and members
    const maxCrewsToRank = 500;
    const crews = await prisma.crew.findMany({
      select: {
        id: true,
        name: true,
        members: {
          select: {
            userId: true,
          },
        },
      },
      take: maxCrewsToRank,
    });

    if (crews.length === 0) {
      return NextResponse.json({
        entries: [],
        total: 0,
        limit,
        offset,
      });
    }

    // 5) Build a list of userIds for all members across all crews
    const userIds = new Set<string>();
    for (const crew of crews) {
      for (const member of crew.members) {
        userIds.add(member.userId);
      }
    }
    const userIdArray = Array.from(userIds);

    if (userIds.size === 0) {
      return NextResponse.json({
        entries: [],
        total: 0,
        limit,
        offset,
      });
    }

    // 6) Fetch trades for all these users in one query
    // We fetch ALL trades (not just in timeframe) because computePnL needs
    // full history for accurate FIFO cost basis calculations
    const allTrades = await prisma.trade.findMany({
      where: {
        userId: {
          in: userIdArray,
        },
      },
      orderBy: {
        timestamp: "asc",
      },
    });

    // 7) Group trades by user ID in memory (Map)
    const tradesByUserId = new Map<string, typeof allTrades>();
    for (const trade of allTrades) {
      if (!tradesByUserId.has(trade.userId)) {
        tradesByUserId.set(trade.userId, []);
      }
      tradesByUserId.get(trade.userId)!.push(trade);
    }

    // 8) Build leaderboard entries using the pure engine
    // The engine will filter by timeframe and chain internally and sort by metric
    const allEntries = buildCrewLeaderboardEntries(
      crews.map((crew) => ({
        id: crew.id,
        name: crew.name,
        members: crew.members.map((m) => ({ userId: m.userId })),
      })),
      tradesByUserId,
      metric,
      timeframe,
      chain
    );

    // 9) Compute total count for pagination
    // Count crews that have at least one member with trades in the timeframe (with chain filter if provided)
    // We need to find crews where at least one member has trades matching the filter
    const crewsWithTrades = await prisma.crew.findMany({
      where: {
        members: {
          some: {
            user: {
              trades: {
                some: tradeFilter,
              },
            },
          },
        },
      },
      select: {
        id: true,
      },
    });
    const total = crewsWithTrades.length;

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
    console.error("Crew Leaderboard API error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

