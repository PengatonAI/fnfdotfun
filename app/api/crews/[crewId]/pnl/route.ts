import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { computePnL } from "@/lib/pnl/engine";

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
      include: { user: true },
    });

    // For each member → get their trades and compute PnL
    const memberStats: any[] = [];

    for (const member of crewMembers) {
      const trades = await prisma.trade.findMany({
        where: { userId: member.userId },
        orderBy: { timestamp: "asc" },
      });

      const pnl = computePnL(trades, {}); // no current prices yet

      memberStats.push({
        userId: member.userId,
        username: member.user?.username,
        pnl,
      });
    }

    // Aggregate crew totals
    const totalPnL = memberStats.reduce((sum, m) => sum + m.pnl.totalPnL, 0);
    const totalVolume = memberStats.reduce((sum, m) => sum + m.pnl.metrics.volume, 0);
    const totalTrades = memberStats.reduce((sum, m) => sum + m.pnl.metrics.totalTrades, 0);

    const avgWinRate =
      memberStats.length > 0
        ? memberStats.reduce((sum, m) => sum + m.pnl.metrics.winRate, 0) /
          memberStats.length
        : 0;

    return NextResponse.json({
      members: memberStats,
      crew: {
        totalPnL,
        totalVolume,
        totalTrades,
        avgWinRate,
      },
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Internal Error" }, { status: 500 });
  }
}

