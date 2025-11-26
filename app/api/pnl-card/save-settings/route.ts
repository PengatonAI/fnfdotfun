import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { computePnL } from "@/lib/pnl/engine";
import { subDays } from "date-fns";

// Valid card modes
const VALID_MODES = ["user", "crew"] as const;

// Valid time ranges
const VALID_RANGES = ["24h", "7d", "30d", "all"] as const;
type TimeRange = (typeof VALID_RANGES)[number];

// Valid themes
const VALID_THEMES = ["dark", "neon", "clean", "cyber"] as const;

/**
 * Get time window based on range string
 */
function getTimeWindow(range: string): { startDate?: Date; endDate?: Date } {
  const now = new Date();

  switch (range) {
    case "24h":
      return { startDate: subDays(now, 1), endDate: now };
    case "7d":
      return { startDate: subDays(now, 7), endDate: now };
    case "30d":
      return { startDate: subDays(now, 30), endDate: now };
    case "all":
    default:
      return {};
  }
}

// POST - Save user's PnL card settings
export async function POST(request: Request) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const body = await request.json();
    const {
      mode,
      timeRange,
      theme,
      accentColor,
      backgroundColor,
      font,
      frame,
      badges,
      showAvatar,
      showUsername,
      showPnl,
      showVolume,
      showWinRate,
      showTotalTrades,
    } = body;

    // Validate mode if provided
    if (mode && !VALID_MODES.includes(mode)) {
      return NextResponse.json(
        { error: "Invalid mode. Must be 'user' or 'crew'" },
        { status: 400 }
      );
    }

    // Validate timeRange if provided
    if (timeRange && !VALID_RANGES.includes(timeRange)) {
      return NextResponse.json(
        { error: "Invalid timeRange" },
        { status: 400 }
      );
    }

    // Validate theme if provided
    if (theme && !VALID_THEMES.includes(theme)) {
      return NextResponse.json(
        { error: "Invalid theme" },
        { status: 400 }
      );
    }

    // Build settings object
    const settings = {
      theme: theme || "dark",
      backgroundColor: backgroundColor || "#111111",
      accentColor: accentColor || "#A855F7",
      showAvatar: showAvatar ?? true,
      showUsername: showUsername ?? true,
      showPnl: showPnl ?? true,
      showVolume: showVolume ?? true,
      showWinRate: showWinRate ?? true,
      showTotalTrades: showTotalTrades ?? true,
      font: font || "Inter",
      frame: frame || "none",
      badges: badges || [],
      mode: mode || "user",
      timeRange: timeRange || "all",
    };

    // Fetch current stats for the user based on timeRange
    const range = timeRange || "all";
    const { startDate, endDate } = getTimeWindow(range);

    const whereClause: {
      userId: string;
      timestamp?: { gte?: Date; lte?: Date };
    } = {
      userId: session.user.id,
    };

    if (startDate || endDate) {
      whereClause.timestamp = {};
      if (startDate) {
        whereClause.timestamp.gte = startDate;
      }
      if (endDate) {
        whereClause.timestamp.lte = endDate;
      }
    }

    // Fetch trades and compute PnL
    const trades = await prisma.trade.findMany({
      where: whereClause,
      orderBy: { timestamp: "asc" },
    });

    const pnlResult = computePnL(trades);

    // Build stats object
    const stats = {
      range,
      pnl: {
        totalPnl: pnlResult.totalPnL,
        realizedPnl: pnlResult.realizedPnL,
        unrealizedPnl: pnlResult.unrealizedPnL,
        winRate: pnlResult.metrics.winRate,
        volume: pnlResult.metrics.volume,
        totalTrades: pnlResult.metrics.totalTrades,
        avgWin: pnlResult.metrics.avgWin,
        avgLoss: pnlResult.metrics.avgLoss,
      },
    };

    // Create snapshot data with both settings and stats
    const snapshotData = JSON.stringify({
      settings,
      stats,
      savedAt: new Date().toISOString(),
    });

    // Find existing saved settings card for this user
    const existingCard = await prisma.sharedCard.findFirst({
      where: {
        userId: session.user.id,
        cardType: "user",
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    let savedCard;

    if (existingCard) {
      // Update existing card
      savedCard = await prisma.sharedCard.update({
        where: { id: existingCard.id },
        data: {
          snapshotData,
          timeframe: range,
        },
      });
    } else {
      // Create new card with a unique share token
      const { randomBytes } = await import("crypto");
      const shareToken = randomBytes(16).toString("hex");

      savedCard = await prisma.sharedCard.create({
        data: {
          shareToken,
          cardType: "user",
          userId: session.user.id,
          snapshotData,
          timeframe: range,
        },
      });
    }

    // Also update UserCardSettings for compatibility
    await prisma.userCardSettings.upsert({
      where: { userId: session.user.id },
      create: {
        userId: session.user.id,
        theme: settings.theme,
        backgroundColor: settings.backgroundColor,
        accentColor: settings.accentColor,
        showAvatar: settings.showAvatar,
        showUsername: settings.showUsername,
        showPnl: settings.showPnl,
        showVolume: settings.showVolume,
        showWinRate: settings.showWinRate,
        showTotalTrades: settings.showTotalTrades,
      },
      update: {
        theme: settings.theme,
        backgroundColor: settings.backgroundColor,
        accentColor: settings.accentColor,
        showAvatar: settings.showAvatar,
        showUsername: settings.showUsername,
        showPnl: settings.showPnl,
        showVolume: settings.showVolume,
        showWinRate: settings.showWinRate,
        showTotalTrades: settings.showTotalTrades,
      },
    });

    return NextResponse.json({
      ok: true,
      cardId: savedCard.shareToken,
      settings,
      stats,
    });
  } catch (error) {
    console.error("Error saving PnL card settings:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// GET - Fetch user's saved PnL card settings
export async function GET() {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Fetch the latest SharedCard for this user
    const savedCard = await prisma.sharedCard.findFirst({
      where: {
        userId: session.user.id,
        cardType: "user",
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    if (!savedCard) {
      return NextResponse.json({
        settings: null,
      });
    }

    try {
      const snapshot = JSON.parse(savedCard.snapshotData);
      return NextResponse.json({
        settings: snapshot.settings || null,
        stats: snapshot.stats || null,
        cardId: savedCard.shareToken,
        timeframe: savedCard.timeframe,
      });
    } catch {
      return NextResponse.json({
        settings: null,
      });
    }
  } catch (error) {
    console.error("Error fetching PnL card settings:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
