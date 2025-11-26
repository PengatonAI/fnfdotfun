import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = 'force-dynamic'; // No caching

/**
 * Debug route to inspect saved trade data in the database
 * GET /api/debug/inspect-db?walletAddress=0x...
 */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const walletAddress = searchParams.get("walletAddress");

  if (!walletAddress) {
    return NextResponse.json(
      { error: "Missing walletAddress query parameter" },
      { status: 400 }
    );
  }

  try {
    // Find the most recent trade for this wallet
    const trade = await prisma.trade.findFirst({
      where: {
        wallet: {
          address: walletAddress,
        },
      },
      orderBy: {
        timestamp: "desc",
      },
      take: 1,
      include: {
        wallet: {
          select: {
            id: true,
            address: true,
            chain: true,
            label: true,
            verified: true,
          },
        },
        user: {
          select: {
            id: true,
            username: true,
            email: true,
          },
        },
      },
    });

    if (!trade) {
      return NextResponse.json(
        {
          message: "No trades found for this wallet address",
          walletAddress,
        },
        { status: 404 }
      );
    }

    // Parse raw field if it exists
    let rawData: any = null;
    if (trade.raw) {
      try {
        rawData = typeof trade.raw === "string" ? JSON.parse(trade.raw) : trade.raw;
      } catch (e) {
        // If parsing fails, include the raw string
        rawData = trade.raw;
      }
    }

    return NextResponse.json({
      meta: {
        walletAddress,
        found: true,
      },
      trade: {
        id: trade.id,
        userId: trade.userId,
        walletId: trade.walletId,
        walletAddress: trade.walletAddress,
        chain: trade.chain,
        platform: trade.platform,
        direction: trade.direction,
        // Token addresses
        baseTokenAddress: trade.baseTokenAddress,
        quoteTokenAddress: trade.quoteTokenAddress,
        // Token symbols
        tokenInSymbol: trade.tokenInSymbol,
        tokenOutSymbol: trade.tokenOutSymbol,
        tokenNameIn: trade.tokenNameIn,
        tokenNameOut: trade.tokenNameOut,
        // Amounts
        normalizedAmountIn: trade.normalizedAmountIn,
        normalizedAmountOut: trade.normalizedAmountOut,
        decimalsIn: trade.decimalsIn,
        decimalsOut: trade.decimalsOut,
        // Prices
        price: trade.price,
        nativePrice: trade.nativePrice,
        // Transaction details
        txHash: trade.txHash,
        txIndex: trade.txIndex,
        timestamp: trade.timestamp,
        // Raw data (parsed if possible)
        raw: rawData,
        // Relations
        wallet: trade.wallet,
        user: trade.user,
        // Metadata
        createdAt: trade.createdAt,
        updatedAt: trade.updatedAt,
      },
    });
  } catch (error: any) {
    console.error("Error inspecting database:", error);
    return NextResponse.json(
      {
        error: error.message || "Internal server error",
        stack: process.env.NODE_ENV === "development" ? error.stack : undefined,
      },
      { status: 500 }
    );
  }
}

