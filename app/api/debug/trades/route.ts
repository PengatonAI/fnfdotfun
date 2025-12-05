import { NextResponse } from "next/server";
import { requireDebugAccess } from "@/lib/security/debug-guard";

export const dynamic = 'force-dynamic';

/**
 * SECURITY: Debug endpoint - only available in development mode
 */
export async function GET() {
  try {
    // SECURITY: Block access in production
    const debugCheck = requireDebugAccess();
    if (debugCheck) {
      return debugCheck;
    }

    // Dynamic imports to avoid build-time initialization
    const { auth } = await import("@/lib/auth");
    const { prisma } = await import("@/lib/prisma");

    // Require valid session
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Query the 10 most recent Trade records for this user
    const trades = await prisma.trade.findMany({
      where: {
        userId: session.user.id,
      },
      orderBy: {
        timestamp: "desc",
      },
      take: 10,
    });

    // Log one trade sample on the server (if available)
    if (trades.length > 0) {
      console.log("DEBUG TRADE SAMPLE:", JSON.stringify(trades[0], null, 2));
    }

    // Return all trades exactly as stored in the DB (no transformation)
    return NextResponse.json({
      totalTrades: trades.length,
      trades: trades,
    });
  } catch (error) {
    console.error("Error fetching trades:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
