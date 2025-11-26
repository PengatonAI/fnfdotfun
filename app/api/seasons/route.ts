import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/**
 * GET /api/seasons
 * 
 * Returns all seasons sorted by startAt DESC.
 */
export async function GET() {
  try {
    // Dynamic import to avoid build-time initialization
    const { prisma } = await import("@/lib/prisma");

    const seasons = await prisma.season.findMany({
      orderBy: {
        startAt: "desc",
      },
    });

    return NextResponse.json(seasons);
  } catch (err) {
    console.error("Seasons API error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

