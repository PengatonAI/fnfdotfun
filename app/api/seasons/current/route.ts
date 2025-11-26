import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentSeason } from "@/lib/seasons/utils";

/**
 * GET /api/seasons/current
 * 
 * Returns the current active season, or null if no season is active.
 */
export async function GET() {
  try {
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

