import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ crewId: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { crewId } = await params;

    // Fetch crew members
    const crewMembers = await prisma.crewMember.findMany({
      where: { crewId },
      include: { 
        user: {
          select: {
            id: true,
            username: true,
            image: true,
          }
        } 
      },
    });

    const memberUserIds = crewMembers.map((m) => m.userId);

    // Fetch recent trades from all crew members (last 10)
    const recentTrades = await prisma.trade.findMany({
      where: {
        userId: { in: memberUserIds },
      },
      orderBy: { timestamp: "desc" },
      take: 10,
      select: {
        id: true,
        chain: true,
        timestamp: true,
        direction: true,
        tokenOutSymbol: true,
        tokenInSymbol: true,
        normalizedAmountOut: true,
        price: true,
        nativePrice: true,
        usdPricePerToken: true,
        usdValue: true,
        walletAddress: true,
        txHash: true,
        raw: true,
        userId: true,
      },
    });

    // Create a map of userId to user info
    const userMap = new Map(
      crewMembers.map((m) => [m.userId, m.user])
    );

    // Add user info to trades
    const tradesWithUser = recentTrades.map((trade) => ({
      ...trade,
      timestamp: trade.timestamp.toISOString(),
      user: userMap.get(trade.userId) || null,
    }));

    // Compute sparkline data for crew performance
    // Fetch all trades for crew members, ordered by timestamp
    const allCrewTrades = await prisma.trade.findMany({
      where: {
        userId: { in: memberUserIds },
      },
      orderBy: { timestamp: "asc" },
      select: {
        timestamp: true,
        usdValue: true,
        direction: true,
      },
    });

    let sparklineData: number[] | undefined = undefined;

    if (allCrewTrades.length > 0) {
      // Group trades by day and compute cumulative PnL
      const dailyPnL: Map<string, number> = new Map();

      for (const trade of allCrewTrades) {
        const dateKey = trade.timestamp.toISOString().split("T")[0];
        const currentDayPnL = dailyPnL.get(dateKey) || 0;
        // Estimate PnL contribution: positive for sells, negative for buys
        const pnlContribution =
          trade.direction === "SELL"
            ? (trade.usdValue || 0) * 0.1 // Simplified: assume 10% profit on sells
            : -(trade.usdValue || 0) * 0.05; // Simplified: assume 5% unrealized on buys
        dailyPnL.set(dateKey, currentDayPnL + pnlContribution);
      }

      // Convert to cumulative sparkline data (last 30 data points)
      const sortedDays = Array.from(dailyPnL.keys()).sort();
      let cumulativePnL = 0;
      const cumulativeData: number[] = [];

      for (const day of sortedDays) {
        cumulativePnL += dailyPnL.get(day) || 0;
        cumulativeData.push(cumulativePnL);
      }

      // Take last 30 points for the sparkline
      sparklineData = cumulativeData.slice(-30);

      // Ensure we have at least 2 points for a proper line
      if (sparklineData.length === 1) {
        sparklineData = [0, sparklineData[0]];
      }
    }

    return NextResponse.json({
      trades: tradesWithUser,
      sparklineData,
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Internal Error" }, { status: 500 });
  }
}

