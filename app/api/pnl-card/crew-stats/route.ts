import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { computePnL } from "@/lib/pnl/engine";
import { subDays } from "date-fns";

// Valid time ranges
const VALID_RANGES = ["24h", "7d", "30d", "all"] as const;
type TimeRange = (typeof VALID_RANGES)[number];

/**
 * Get time window based on range string
 */
function getTimeWindow(range: string): { startDate?: Date; endDate?: Date } {
  const now = new Date();

  switch (range) {
    case "24h":
      return { startDate: subDays(now, 1), endDate: now };
    case "7d":
      return { startDate: subDays(now, 7), endDate: now };
    case "30d":
      return { startDate: subDays(now, 30), endDate: now };
    case "all":
    default:
      return {};
  }
}

// GET - Fetch crew PnL stats for card
export async function GET(request: Request) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Get params from query
    const { searchParams } = new URL(request.url);
    const crewId = searchParams.get("crewId");
    const range = searchParams.get("range") || "all";

    // Validate crewId
    if (!crewId) {
      return NextResponse.json(
        { error: "crewId is required" },
        { status: 400 }
      );
    }

    // Validate range
    if (!VALID_RANGES.includes(range as TimeRange)) {
      return NextResponse.json(
        { error: "Invalid range" },
        { status: 400 }
      );
    }

    // Fetch crew with members
    const crew = await prisma.crew.findUnique({
      where: { id: crewId },
      include: {
        members: {
          include: { user: true },
        },
      },
    });

    if (!crew) {
      return NextResponse.json(
        { error: "Crew not found" },
        { status: 404 }
      );
    }

    // Validate user is a member of the crew
    const isMember = crew.members.some((m) => m.userId === session.user.id);
    const isCreator = crew.createdByUserId === session.user.id;

    if (!isMember && !isCreator) {
      return NextResponse.json(
        { error: "Forbidden" },
        { status: 403 }
      );
    }

    // Get time window
    const { startDate, endDate } = getTimeWindow(range);

    // Build base timestamp filter
    const timestampFilter: { gte?: Date; lte?: Date } | undefined =
      startDate || endDate
        ? {
            ...(startDate && { gte: startDate }),
            ...(endDate && { lte: endDate }),
          }
        : undefined;

    // Aggregate PnL across all crew members
    let totalPnl = 0;
    let realizedPnl = 0;
    let unrealizedPnl = 0;
    let totalVolume = 0;
    let totalTrades = 0;

    // For averaging
    let winRateSum = 0;
    let avgWinSum = 0;
    let avgLossSum = 0;
    let membersWithTrades = 0;

    // Process each crew member
    for (const member of crew.members) {
      // Fetch trades for this member within time window
      const trades = await prisma.trade.findMany({
        where: {
          userId: member.userId,
          ...(timestampFilter && { timestamp: timestampFilter }),
        },
        orderBy: { timestamp: "asc" },
      });

      if (trades.length === 0) {
        continue;
      }

      // Compute PnL for this member
      const pnlResult = computePnL(trades);

      // Sum totals
      totalPnl += pnlResult.totalPnL;
      realizedPnl += pnlResult.realizedPnL;
      unrealizedPnl += pnlResult.unrealizedPnL;
      totalVolume += pnlResult.metrics.volume;
      totalTrades += pnlResult.metrics.totalTrades;

      // Accumulate for averaging
      winRateSum += pnlResult.metrics.winRate;
      avgWinSum += pnlResult.metrics.avgWin;
      avgLossSum += pnlResult.metrics.avgLoss;
      membersWithTrades++;
    }

    // Calculate averages (protect against division by zero)
    const avgWinRate = membersWithTrades > 0 ? winRateSum / membersWithTrades : 0;
    const avgWin = membersWithTrades > 0 ? avgWinSum / membersWithTrades : 0;
    const avgLoss = membersWithTrades > 0 ? avgLossSum / membersWithTrades : 0;

    // Format response
    return NextResponse.json({
      crewId,
      range,
      pnl: {
        totalPnl,
        realizedPnl,
        unrealizedPnl,
        winRate: avgWinRate,
        volume: totalVolume,
        totalTrades,
        avgWin,
        avgLoss,
      },
      memberCount: crew.members.length,
    });
  } catch (error) {
    console.error("Error fetching crew stats:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
