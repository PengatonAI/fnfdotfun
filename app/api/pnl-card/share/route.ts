import { NextResponse } from "next/server";
import { randomBytes } from "crypto";

export const dynamic = "force-dynamic";

// Valid card types
const VALID_TYPES = ["user", "crew"] as const;
type CardType = (typeof VALID_TYPES)[number];

// Valid time ranges
const VALID_RANGES = ["24h", "7d", "30d", "all"] as const;

// POST - Create a shareable card link
export async function POST(request: Request) {
  try {
    // Dynamic imports to avoid build-time initialization
    const { auth } = await import("@/lib/auth");
    const { prisma } = await import("@/lib/prisma");

    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { type, crewId, settings, stats, range } = body;

    // Validate type
    if (!type) {
      return NextResponse.json(
        { error: "type is required" },
        { status: 400 }
      );
    }

    if (!VALID_TYPES.includes(type as CardType)) {
      return NextResponse.json(
        { error: "Invalid type. Must be 'user' or 'crew'" },
        { status: 400 }
      );
    }

    // Validate crewId for crew type
    if (type === "crew" && !crewId) {
      return NextResponse.json(
        { error: "crewId is required for crew type" },
        { status: 400 }
      );
    }

    // Validate range if provided
    const timeframe = range || "all";
    if (!VALID_RANGES.includes(timeframe)) {
      return NextResponse.json(
        { error: "Invalid range" },
        { status: 400 }
      );
    }

    // For crew type, validate crew exists and user has access
    if (type === "crew") {
      const crew = await prisma.crew.findUnique({
        where: { id: crewId },
        include: {
          members: true,
        },
      });

      if (!crew) {
        return NextResponse.json(
          { error: "Crew not found" },
          { status: 404 }
        );
      }

      // Validate user is member or creator
      const isMember = crew.members.some((m) => m.userId === session.user.id);
      const isCreator = crew.createdByUserId === session.user.id;

      if (!isMember && !isCreator) {
        return NextResponse.json(
          { error: "Forbidden" },
          { status: 403 }
        );
      }
    }

    // Generate unique share token
    const shareToken = randomBytes(16).toString("hex");

    // Create snapshot data combining settings and stats
    const snapshotData = JSON.stringify({
      settings: settings || {},
      stats: stats || {},
    });

    // Create SharedCard
    const sharedCard = await prisma.sharedCard.create({
      data: {
        shareToken,
        cardType: type,
        userId: type === "user" ? session.user.id : null,
        crewId: type === "crew" ? crewId : null,
        snapshotData,
        timeframe,
      },
    });

    return NextResponse.json({
      ok: true,
      cardId: sharedCard.shareToken,
    });
  } catch (error) {
    console.error("Error creating shared card:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
