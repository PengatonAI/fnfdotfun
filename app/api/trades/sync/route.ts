import { NextResponse } from "next/server";
import { rateLimit, getClientIP } from "@/lib/security/rate-limit";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    // SECURITY: Rate limiting for trade sync endpoint (prevent abuse)
    const clientIP = getClientIP(request);
    const rateLimitResult = rateLimit(`sync:${clientIP}`, {
      windowMs: 60 * 1000, // 1 minute window
      maxRequests: 5, // Max 5 syncs per minute per IP
    });

    if (!rateLimitResult.success) {
      return NextResponse.json(
        {
          error: rateLimitResult.error || "Too many requests",
          retryAfter: Math.ceil((rateLimitResult.resetTime - Date.now()) / 1000),
        },
        {
          status: 429,
          headers: {
            'Retry-After': Math.ceil((rateLimitResult.resetTime - Date.now()) / 1000).toString(),
            'X-RateLimit-Limit': '5',
            'X-RateLimit-Remaining': rateLimitResult.remaining.toString(),
            'X-RateLimit-Reset': new Date(rateLimitResult.resetTime).toISOString(),
          },
        }
      );
    }

    // Dynamic imports to avoid build-time initialization
    const { auth } = await import("@/lib/auth");
    const { prisma } = await import("@/lib/prisma");
    const { syncEvmWalletTrades, getEvmTrades } = await import("@/lib/trades/evm-sync");
    const { saveCanonicalTrades } = await import("@/lib/trades/persist");
    const { normalizeChain } = await import("@/lib/utils/normalize-chain");
    const { initSync, setDone, setError } = await import("@/lib/trades/sync-status");

    // Initialize sync progress tracking
    initSync();
    
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Parse request body for chain parameter
    const body = await request.json().catch(() => ({}));
    const chain = body.chain;

    // Normalize chain parameter before querying (default to 'evm' if not provided)
    let normalizedChain: "evm" | "solana";
    try {
      normalizedChain = normalizeChain(chain || "evm");
    } catch (error) {
      return NextResponse.json(
        { error: error instanceof Error ? error.message : "Invalid chain" },
        { status: 400 }
      );
    }

    console.log("SYNC QUERY:", { userId: session.user.id, chain: normalizedChain });

    // Fetch wallets for this user with the normalized chain
    const wallets = await prisma.wallet.findMany({
      where: {
        userId: session.user.id,
        chain: normalizedChain,
      },
      select: {
        id: true,
        address: true,
        chain: true,
      },
    });

    console.log("WALLETS FOUND:", wallets.length);
    console.log("WALLET QUERY RESULT:", JSON.stringify(wallets, null, 2));

    if (wallets.length === 0) {
      // Debug: Find ALL wallets for this user (no chain filter)
      const allUserWallets = await prisma.wallet.findMany({
        where: { userId: session.user.id },
      });
      console.log("ALL USER WALLETS (no chain filter):", allUserWallets);

      const response = {
        success: true,
        chain: normalizedChain,
        synced: {
          totalTrades: 0,
          byWallet: [],
        },
      };
      console.log("SYNC RESPONSE:", JSON.stringify({ walletsQueried: 0, tradesFound: 0, chain: normalizedChain }, null, 2));
      
      return NextResponse.json(response);
    }

    const results: Array<{ walletAddress: string; chain: string; newTrades: number }> = [];
    let totalTrades = 0;

    // Sync each EVM wallet
    for (const wallet of wallets) {
      try {
        console.log('Syncing wallet:', wallet.address);
        
        // Get or create sync state
        let syncState = await prisma.walletSyncState.findUnique({
          where: {
            unique_sync_state: {
              userId: session.user.id,
              walletAddress: wallet.address.toLowerCase(),
              chain: normalizedChain,
            },
          },
        });

        if (!syncState) {
          syncState = await prisma.walletSyncState.create({
            data: {
              userId: session.user.id,
              walletAddress: wallet.address.toLowerCase(),
              chain: normalizedChain,
              lastSyncedCursor: null,
            },
          });
        }

        // Sync EVM trades
        const syncResult = await syncEvmWalletTrades({
          userId: session.user.id,
          walletAddress: wallet.address,
          lastSyncedCursor: syncState.lastSyncedCursor,
          walletId: wallet.id,
          chain: wallet.chain,
        });

        // Get the actual trades for persistence
        const trades = await getEvmTrades(
          {
            userId: session.user.id,
            walletAddress: wallet.address,
            lastSyncedCursor: syncState.lastSyncedCursor,
            chain: wallet.chain,
          },
          wallet.id
        );

        // Persist trades to database
        const inserted = await saveCanonicalTrades(
          session.user.id,
          wallet.address,
          normalizedChain,
          trades
        );
        
        // Log final summary: "Fetched X transfers, detected Y swaps, saved Z trades"
        console.log(`Fetched ${syncResult.transfersFetched} transfers, detected ${trades.length} swaps, saved ${inserted} trades`);

        // Update sync state
        if (syncResult.lastSyncedCursor) {
          await prisma.walletSyncState.update({
            where: { id: syncState.id },
            data: {
              lastSyncedCursor: syncResult.lastSyncedCursor,
            },
          });
        }

        results.push({
          walletAddress: wallet.address,
          chain: wallet.chain,
          newTrades: inserted,
        });

        totalTrades += inserted;
      } catch (error) {
        console.error(`Error syncing wallet ${wallet.address}:`, error);
        // Continue with other wallets even if one fails
      }
    }

    const response = {
      success: true,
      chain: normalizedChain,
      synced: {
        totalTrades,
        byWallet: results,
      },
    };

    console.log("SYNC RESPONSE:", JSON.stringify({ walletsQueried: wallets.length, tradesFound: totalTrades, chain: normalizedChain }, null, 2));

    // Mark sync as done before returning success
    setDone();

    return NextResponse.json(response);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Internal server error";
    console.error("Trade sync error:", errorMessage);
    
    return NextResponse.json(
      { 
        error: errorMessage,
        success: false,
      },
      { status: 500 }
    );
  }
}
