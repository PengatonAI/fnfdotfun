import { Navbar } from "@/components/navbar";
import { redirect } from "next/navigation";
import TradesTable from "./trades-table";
import SyncButton from "./sync-button";
import { PnlTradeSummary } from "@/components/pnl/pnl-trade-summary";

// Force dynamic rendering to ensure fresh data (including nativePrice)
export const dynamic = 'force-dynamic';

export default async function TradesPage() {
  // Dynamic imports to avoid build-time initialization
  const { auth } = await import("@/lib/auth");
  const { prisma } = await import("@/lib/prisma");

  const session = await auth();

  if (!session?.user?.id) {
    redirect("/login");
  }

  // Fetch all trades directly from the database
  // Trades are already cleaned and parsed by the cleanup script
  // Note: Using type assertion because Prisma client may need regeneration after schema changes
  // No top-level `select` block means ALL Trade fields are returned, including `nativePrice`
  // The `include` block only affects the related `wallet` relation, not the Trade fields
  const trades = await prisma.trade.findMany({
    where: {
      userId: session.user.id,
    } as any,
    // No top-level select = all Trade model fields returned (including nativePrice)
    include: {
      wallet: {
        select: {
          address: true,
          chain: true,
          label: true,
        },
      },
    },
    orderBy: {
      timestamp: "desc",
    },
    take: 1000, // Limit to prevent performance issues
  });

  // Map trades to the format expected by TradesTable
  // Use DB fields directly (already cleaned by cleanup script)
  // Include raw field for display field extraction
  // Type assertion needed because Prisma types may be outdated
  // CRITICAL: nativePrice must be explicitly included for USD price calculations in TradesTable
  const mappedTrades = trades.map((t: any) => {
    return {
      id: t.id,
      chain: t.chain,
      timestamp: t.timestamp,
      direction: t.direction || "BUY", // Default to BUY if null
      token: t.tokenOutSymbol, // Fallback if display fields not available
      // Use ?? (nullish coalescing) instead of || to preserve 0 values
      amount: t.normalizedAmountOut, // Fallback if display fields not available
      price: t.price,
      // CRITICAL: nativePrice MUST be copied from DB result to component prop
      // This field comes from prisma.trade.findMany (all fields returned)
      // Required by TradesTable for USD price display (usdPrice = price * nativePrice)
      nativePrice: t.nativePrice ?? null, // USD price of native token (ETH, SOL) at trade time
      // USD proof system fields (calculated at sync time)
      usdPricePerToken: t.usdPricePerToken ?? null, // Stored USD price per token
      usdValue: t.usdValue ?? null, // Stored total USD value
      tokenInSymbol: t.tokenInSymbol, // For determining counter token symbol
      tokenOutSymbol: t.tokenOutSymbol, // For determining counter token symbol
      walletAddress: t.walletAddress,
      txHash: t.txHash,
      wallet: t.wallet,
      raw: t.raw, // Include raw field for display field extraction
    };
  });

  return (
    <>
      <Navbar />
      <div className="container mx-auto py-8 max-w-7xl">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold mb-2">Trade History</h1>
            <p className="text-sm text-muted-foreground">
              View your trading activity across all connected wallets.
            </p>
          </div>
          <SyncButton />
        </div>
        <PnlTradeSummary />
        <TradesTable trades={mappedTrades} />
      </div>
    </>
  );
}

