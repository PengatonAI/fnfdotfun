import { NextRequest, NextResponse } from "next/server";
import { requireDebugAccess } from "@/lib/security/debug-guard";

export const dynamic = 'force-dynamic';

/**
 * SECURITY: Debug endpoint - only available in development mode
 */
export async function GET(req: NextRequest) {
  // SECURITY: Block access in production
  const debugCheck = requireDebugAccess();
  if (debugCheck) {
    return debugCheck;
  }

  const { searchParams } = new URL(req.url);
  const walletAddress = searchParams.get("walletAddress");
  const chain = searchParams.get("chain");

  if (!walletAddress || !chain) {
    return NextResponse.json({ error: "Missing walletAddress or chain" }, { status: 400 });
  }

  try {
    // Dynamic imports to avoid build-time initialization
    const { prisma } = await import("@/lib/prisma");
    const { normalizeChain } = await import("@/lib/utils/normalize-chain");

    const normalizedChain = normalizeChain(chain);
    
    // 1. Find the wallet
    const wallet = await prisma.wallet.findFirst({
      where: {
        address: walletAddress.toLowerCase(),
        chain: normalizedChain,
      },
    });

    if (!wallet) {
      return NextResponse.json({ error: "Wallet not found in database" }, { status: 404 });
    }

    // 2. Perform the wipe (Transaction)
    const result = await prisma.$transaction(async (tx) => {
      
      // A. Delete trades (This likely works with walletId)
      const deleteResult = await tx.trade.deleteMany({
        where: {
          walletId: wallet.id,
        },
      });

      // B. Reset Cursor (FIX: Use address + chain, NOT walletId)
      const updateResult = await tx.walletSyncState.updateMany({
        where: {
          walletAddress: wallet.address, // <--- CHANGED THIS
          chain: wallet.chain,           // <--- AND THIS
        },
        data: {
          lastSyncedCursor: "0",
        },
      });

      return { deleted: deleteResult.count, reset: updateResult };
    });

    return NextResponse.json({ 
      success: true, 
      message: `Successfully wiped ${result.deleted} bad trades. Sync cursor reset to 0.`,
      data: result 
    });

  } catch (error: any) {
    return NextResponse.json({ error: error.message, stack: error.stack }, { status: 500 });
  }
}

