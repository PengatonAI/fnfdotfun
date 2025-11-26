import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    // Only allow in development environment
    if (process.env.NODE_ENV !== "development") {
      return NextResponse.json(
        { error: "This endpoint is only available in development environment" },
        { status: 403 }
      );
    }

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
