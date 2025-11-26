import { NextResponse } from "next/server";

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    // Only allow in development environment
    if (process.env.NODE_ENV !== "development") {
      return NextResponse.json(
        { error: "This endpoint is only available in development environment" },
        { status: 403 }
      );
    }

    // Dynamic imports to avoid build-time initialization
    const { auth } = await import("@/lib/auth");
    const { prisma } = await import("@/lib/prisma");
    const { buildTradeFromTransfers } = await import("@/lib/trades/evm-sync");

    // Require valid session
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Query the last 5 trades for this user
    const trades = await prisma.trade.findMany({
      where: {
        userId: session.user.id,
      },
      orderBy: {
        timestamp: "desc",
      },
      take: 5,
    });

    // Process each trade: return raw DB record + parsed version
    const results = await Promise.all(trades.map(async (trade) => {
      const raw = trade;
      let parsed: any = null;

      try {
        // Extract transfers from the stored raw payload
        let transfers: any[] = [];
        
        if (trade.raw) {
          try {
            const rawData = typeof trade.raw === "string" ? JSON.parse(trade.raw) : trade.raw;
            // The raw field should contain { transfers: [...], txHash: "..." }
            if (rawData.transfers && Array.isArray(rawData.transfers)) {
              transfers = rawData.transfers;
            } else if (Array.isArray(rawData)) {
              // Fallback: if raw is directly an array of transfers
              transfers = rawData;
            }
          } catch (parseError) {
            console.error(`Error parsing raw field for trade ${trade.id}:`, parseError);
          }
        }

        // If we have transfers, run the parsing logic
        // Note: We use "ethereum" as default chain since trades store "evm" not the specific chain name
        if (transfers.length > 0 && trade.walletAddress && trade.txHash) {
          const parsedResult = await buildTradeFromTransfers(
            trade.userId,
            trade.walletId,
            trade.walletAddress,
            trade.txHash,
            transfers,
            trade.timestamp,
            "ethereum" // Default to ethereum for historical trades
          );
          
          if (parsedResult) {
            parsed = parsedResult;
          } else {
            parsed = { error: "buildTradeFromTransfers returned null (not a valid swap)" };
          }
        } else {
          parsed = { 
            error: "Missing transfers data in raw field",
            rawField: trade.raw,
            hasTransfers: transfers.length > 0
          };
        }
      } catch (error) {
        console.error(`Error parsing trade ${trade.id}:`, error);
        parsed = { 
          error: error instanceof Error ? error.message : "Unknown parsing error",
          errorDetails: String(error)
        };
      }

      return {
        raw,
        parsed,
      };
    }));

    return NextResponse.json(results);
  } catch (error) {
    console.error("Error fetching parsed trades:", error);
    return NextResponse.json(
      { 
        error: "Internal server error",
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  }
}

