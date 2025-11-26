import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * POST /api/admin/seasons/create
 * 
 * Admin-only endpoint to create seasons and tournaments.
 * Only users with xHandle === "nanoxbt" can access this.
 */
export async function POST(request: Request) {
  try {
    // Dynamic imports to prevent build-time initialization
    const { auth } = await import("@/lib/auth");
    const { prisma } = await import("@/lib/prisma");

    // 1. Verify user session
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Admin authorization: only X user with username "nanoxbt" can create seasons or tournaments
    if (!session?.user?.username || session.user.username !== "nanoxbt") {
      return NextResponse.json({ error: "Admin access required" }, { status: 403 });
    }

    // 3. Parse request body
    const body = await request.json();
    const {
      name,
      startAt,
      endAt,
      isTournament = false,
      visibility,
      allowedChains,
      allowedUsers,
      allowedCrews,
      rules,
      description,
    } = body;

    // 4. Validate required fields
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

    // 5. Convert array fields to JSON strings for SQLite
    const allowedChainsJson = allowedChains
      ? JSON.stringify(allowedChains)
      : null;
    const allowedUsersJson = allowedUsers
      ? JSON.stringify(allowedUsers)
      : null;
    const allowedCrewsJson = allowedCrews
      ? JSON.stringify(allowedCrews)
      : null;

    // 6. Insert into Prisma
    const season = await prisma.season.create({
      data: {
        name,
        startAt: startDate,
        endAt: endDate,
        isTournament,
        visibility: visibility || null,
        allowedChains: allowedChainsJson,
        allowedUsers: allowedUsersJson,
        allowedCrews: allowedCrewsJson,
        rules: rules || null,
        description: description || null,
        createdBy: isTournament ? session.user.id : null,
      },
    });

    // 7. Return JSON with status 201
    return NextResponse.json(season, { status: 201 });
  } catch (err) {
    console.error("Admin create season error:", err);

    // 8. Error handling
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
