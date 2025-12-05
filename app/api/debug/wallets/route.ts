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

    // Dynamic import to avoid build-time Prisma initialization
    const { prisma } = await import("@/lib/prisma");

    // Fetch all wallets with selected fields
    const wallets = await prisma.wallet.findMany({
      select: {
        id: true,
        userId: true,
        address: true,
        chain: true,
        createdAt: true,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    // Group wallets by userId
    const groupedByUser = wallets.reduce((acc, wallet) => {
      if (!acc[wallet.userId]) {
        acc[wallet.userId] = {
          userId: wallet.userId,
          wallets: [],
          count: 0,
        };
      }
      acc[wallet.userId].wallets.push(wallet);
      acc[wallet.userId].count += 1;
      return acc;
    }, {} as Record<string, { userId: string; wallets: typeof wallets; count: number }>);

    // Convert to array format
    const result = Object.values(groupedByUser);

    return NextResponse.json({
      totalWallets: wallets.length,
      totalUsers: result.length,
      groupedByUser: result,
    });
  } catch (error) {
    console.error("Error fetching all wallets:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
