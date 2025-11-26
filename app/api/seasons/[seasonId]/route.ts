import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/**
 * GET /api/seasons/[seasonId]
 * 
 * Returns a single season by ID, or 404 if not found.
 */
export async function GET(
  request: Request,
  { params }: { params: { seasonId: string } }
) {
  try {
    // Dynamic import to avoid build-time initialization
    const { prisma } = await import("@/lib/prisma");

    const { seasonId } = params;

    const season = await prisma.season.findUnique({
      where: { id: seasonId },
    });

    if (!season) {
      return NextResponse.json(
        { error: "Season not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(season);
  } catch (err) {
    console.error("Season API error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

