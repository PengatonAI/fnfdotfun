import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/**
 * POST /api/seasons/[seasonId]/snapshot
 * 
 * Creates snapshots for all users who have trades.
 * 
 * This endpoint:
 * 1. Fetches all users who have trades
 * 2. Computes current PnL using computePnL
 * 3. Inserts a snapshot row into SeasonUserSnapshot if not exists
 * 4. NEVER updates an existing snapshot (snapshots are immutable)
 */
export async function POST(
  request: Request,
  { params }: { params: { seasonId: string } }
) {
  try {
    // Dynamic imports to avoid build-time initialization
    const { prisma } = await import("@/lib/prisma");
    const { computePnL } = await import("@/lib/pnl/engine");

    const { seasonId } = params;

    // Verify season exists
    const season = await prisma.season.findUnique({
      where: { id: seasonId },
    });

    if (!season) {
      return NextResponse.json(
        { error: "Season not found" },
        { status: 404 }
      );
    }

    // Fetch all users who have trades
    const users = await prisma.user.findMany({
      where: {
        trades: {
          some: {},
        },
      },
      select: {
        id: true,
      },
    });

    const results = {
      created: 0,
      skipped: 0,
      errors: 0,
    };

    // Process each user
    for (const user of users) {
      try {
        // Check if snapshot already exists
        const existing = await prisma.seasonUserSnapshot.findUnique({
          where: {
            seasonId_userId: {
              seasonId,
              userId: user.id,
            },
          },
        });

        // Skip if snapshot already exists (immutable)
        if (existing) {
          results.skipped++;
          continue;
        }

        // Fetch all trades for this user
        const trades = await prisma.trade.findMany({
          where: {
            userId: user.id,
          },
          orderBy: {
            timestamp: "asc",
          },
        });

        // Compute current PnL
        const pnl = computePnL(trades, {});

        // Insert snapshot (immutable - never update)
        await prisma.seasonUserSnapshot.create({
          data: {
            seasonId,
            userId: user.id,
            realizedPnl: pnl.realizedPnL,
            totalPnl: pnl.totalPnL,
            volume: pnl.metrics.volume,
            totalTrades: pnl.metrics.totalTrades,
          },
        });

        results.created++;
      } catch (err) {
        console.error(`Error creating snapshot for user ${user.id}:`, err);
        results.errors++;
      }
    }

    return NextResponse.json({
      message: "Snapshot creation completed",
      results,
    });
  } catch (err) {
    console.error("Snapshot API error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

