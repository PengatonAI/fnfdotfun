import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * POST /api/admin/seasons/[seasonId]/update
 * 
 * Admin-only endpoint to update a tournament.
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ seasonId: string }> }
) {
  try {
    // Dynamic imports to prevent build-time initialization
    const { auth } = await import("@/lib/auth");
    const { prisma } = await import("@/lib/prisma");

    const { seasonId } = await params;

    // 1. Verify user session
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // 2. Verify admin
    if (!session?.user?.username || session.user.username !== "nanoxbt") {
      return NextResponse.json(
        { error: "Admin access required" },
        { status: 403 }
      );
    }

    // 3. Verify season exists
    const season = await prisma.season.findUnique({
      where: { id: seasonId },
    });

    if (!season) {
      return NextResponse.json(
        { error: "Season not found" },
        { status: 404 }
      );
    }

    // 4. Parse request body
    const body = await request.json();
    const {
      name,
      startAt,
      endAt,
      visibility,
      allowedChains,
      allowedUsers,
      allowedCrews,
      rules,
      description,
    } = body;

    // 5. Validate required fields
    if (!name || !startAt || !endAt) {
      return NextResponse.json(
        { error: "Missing required fields: name, startAt, endAt" },
        { status: 400 }
      );
    }

    // Validate date format
    const startDate = new Date(startAt);
    const endDate = new Date(endAt);

    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
      return NextResponse.json(
        { error: "Invalid date format for startAt or endAt" },
        { status: 400 }
      );
    }

    if (startDate >= endDate) {
      return NextResponse.json(
        { error: "startAt must be before endAt" },
        { status: 400 }
      );
    }

    // 6. Convert array fields to JSON strings for SQLite
    const allowedChainsJson = allowedChains
      ? JSON.stringify(allowedChains)
      : null;
    const allowedUsersJson = allowedUsers
      ? JSON.stringify(allowedUsers)
      : null;
    const allowedCrewsJson = allowedCrews
      ? JSON.stringify(allowedCrews)
      : null;

    // 7. Update season
    const updatedSeason = await prisma.season.update({
      where: { id: seasonId },
      data: {
        name,
        startAt: startDate,
        endAt: endDate,
        visibility: visibility || null,
        allowedChains: allowedChainsJson,
        allowedUsers: allowedUsersJson,
        allowedCrews: allowedCrewsJson,
        rules: body.rules ?? null,
        description: body.description ?? null,
      },
    });

    // 8. Return updated season
    return NextResponse.json(updatedSeason, { status: 200 });
  } catch (err) {
    console.error("Admin update season error:", err);
    
    if (err instanceof SyntaxError) {
      return NextResponse.json(
        { error: "Invalid JSON in request body" },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
