import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    // Dynamic imports to avoid build-time initialization
    const { auth } = await import("@/lib/auth");
    const { prisma } = await import("@/lib/prisma");
    const { computePnL } = await import("@/lib/pnl/engine");
    const { pricingProvider } = await import("@/lib/pnl/current-prices");

    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user.id;

    // Fetch all trades for this user
    const trades = await prisma.trade.findMany({
      where: { userId },
      orderBy: { timestamp: "asc" },
    });

    // Fetch current prices for all unique tokens
    const uniqueTokens = new Set<string>();
    for (const t of trades) {
      // Extract token addresses similar to engine.ts normalizeTrades
      let tokenInAddress: string | null = null;
      let tokenOutAddress: string | null = null;

      // Try to extract from raw field first
      try {
        if (t.raw) {
          const rawData = typeof t.raw === "string" ? JSON.parse(t.raw) : t.raw;
          tokenInAddress = rawData?.tokenInAddress ?? null;
          tokenOutAddress = rawData?.tokenOutAddress ?? null;
        }
      } catch (e) {
        // Invalid JSON in raw field, continue with derivation
      }

      // If not in raw, derive from baseTokenAddress/quoteTokenAddress based on direction
      if (!tokenInAddress || !tokenOutAddress) {
        const direction = t.direction?.toUpperCase() as "BUY" | "SELL" | undefined;
        
        if (direction === "BUY") {
          // For BUY: base = tokenOut (what we receive), quote = tokenIn (what we pay)
          tokenInAddress = t.quoteTokenAddress || null;
          tokenOutAddress = t.baseTokenAddress || null;
        } else if (direction === "SELL") {
          // For SELL: base = tokenIn (what we receive), quote = tokenOut (what we pay)
          tokenInAddress = t.baseTokenAddress || null;
          tokenOutAddress = t.quoteTokenAddress || null;
        } else {
          // Unknown direction, use base as tokenOut, quote as tokenIn as fallback
          tokenInAddress = t.quoteTokenAddress || null;
          tokenOutAddress = t.baseTokenAddress || null;
        }
      }

      // Add both token addresses to the set (if they exist)
      if (tokenOutAddress) uniqueTokens.add(`${tokenOutAddress}_${t.chain}`);
      if (tokenInAddress) uniqueTokens.add(`${tokenInAddress}_${t.chain}`);
    }

    const currentPrices: Record<string, number> = {};
    for (const key of Array.from(uniqueTokens)) {
      const [addr, chain] = key.split("_");
      const price = await pricingProvider.getCurrentPrice(addr, chain);
      if (price) currentPrices[key] = price;
    }

    // Compute PnL using the engine
    const pnl = computePnL(trades, currentPrices);

    return NextResponse.json(pnl);
  } catch (err) {
    console.error("PnL API error:", err);
    return NextResponse.json({ error: "Internal Error" }, { status: 500 });
  }
}

