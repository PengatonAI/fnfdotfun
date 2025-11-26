import { NextResponse } from "next/server";
import { subDays } from "date-fns";

export const dynamic = "force-dynamic";

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

// GET - Fetch user PnL stats for card
export async function GET(request: Request) {
  try {
    // Dynamic imports to avoid build-time initialization
    const { auth } = await import("@/lib/auth");
    const { prisma } = await import("@/lib/prisma");
    const { computePnL } = await import("@/lib/pnl/engine");

    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Get range from query params (default to "all")
    const { searchParams } = new URL(request.url);
    const range = searchParams.get("range") || "all";

    // Validate range
    if (!VALID_RANGES.includes(range as TimeRange)) {
      return NextResponse.json(
        { error: "Invalid range" },
        { status: 400 }
      );
    }

    // Get time window
    const { startDate, endDate } = getTimeWindow(range);

    // Build Prisma where clause
    const whereClause: {
      userId: string;
      timestamp?: { gte?: Date; lte?: Date };
    } = {
      userId: session.user.id,
    };

    if (startDate || endDate) {
      whereClause.timestamp = {};
      if (startDate) {
        whereClause.timestamp.gte = startDate;
      }
      if (endDate) {
        whereClause.timestamp.lte = endDate;
      }
    }

    // Fetch trades for the user within time window
    const trades = await prisma.trade.findMany({
      where: whereClause,
      orderBy: { timestamp: "asc" },
    });

    // Compute PnL using the engine
    const pnlResult = computePnL(trades);

    // Format response
    return NextResponse.json({
      range,
      pnl: {
        totalPnl: pnlResult.totalPnL,
        realizedPnl: pnlResult.realizedPnL,
        unrealizedPnl: pnlResult.unrealizedPnL,
        winRate: pnlResult.metrics.winRate,
        volume: pnlResult.metrics.volume,
        totalTrades: pnlResult.metrics.totalTrades,
        avgWin: pnlResult.metrics.avgWin,
        avgLoss: pnlResult.metrics.avgLoss,
      },
    });
  } catch (error) {
    console.error("Error fetching user stats:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
