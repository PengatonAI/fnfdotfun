import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

// GET - Fetch shared card data (public endpoint - no auth required)
export async function GET(
  request: Request,
  { params }: { params: Promise<{ cardId: string }> }
) {
  try {
    // Dynamic import to avoid build-time initialization
    const { prisma } = await import("@/lib/prisma");

    const { cardId } = await params;

    // Fetch card by shareToken
    const card = await prisma.sharedCard.findUnique({
      where: { shareToken: cardId },
    });

    if (!card) {
      return NextResponse.json(
        { error: "Card not found" },
        { status: 404 }
      );
    }

    // Parse snapshot data
    let snapshot: { settings?: object; stats?: object; username?: string } = {};
    try {
      snapshot = JSON.parse(card.snapshotData);
    } catch {
      // If parsing fails, use empty objects
      snapshot = { settings: {}, stats: {} };
    }

    // Fetch username if userId exists and not in snapshot
    let username = snapshot.username;
    if (!username && card.userId) {
      const user = await prisma.user.findUnique({
        where: { id: card.userId },
        select: { username: true, name: true },
      });
      username = user?.username || user?.name || undefined;
    }

    // For crew cards, fetch crew name
    let crewName: string | undefined;
    if (card.cardType === "crew" && card.crewId) {
      const crew = await prisma.crew.findUnique({
        where: { id: card.crewId },
        select: { name: true },
      });
      crewName = crew?.name;
    }

    // Increment view counter (fire and forget - don't block response)
    prisma.sharedCard
      .update({
        where: { shareToken: cardId },
        data: { viewCount: { increment: 1 } },
      })
      .catch((err) => {
        console.error("Error incrementing view count:", err);
      });

    // Return card data
    return NextResponse.json({
      cardId: card.shareToken,
      type: card.cardType,
      settings: snapshot.settings || {},
      stats: snapshot.stats || {},
      range: card.timeframe || "all",
      userId: card.userId,
      crewId: card.crewId,
      username: card.cardType === "crew" ? crewName : username,
    });
  } catch (error) {
    console.error("Error fetching shared card:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
