import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/**
 * GET /api/seasons/current
 * 
 * Returns the current active season, or null if no season is active.
 */
export async function GET() {
  try {
    // Dynamic imports to avoid build-time initialization
    const { prisma } = await import("@/lib/prisma");
    const { getCurrentSeason } = await import("@/lib/seasons/utils");

    const season = await getCurrentSeason(prisma);

    return NextResponse.json(season);
  } catch (err) {
    console.error("Current season API error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

