import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/**
 * GET /api/seasons
 * 
 * Returns all seasons sorted by startAt DESC.
 */
export async function GET() {
  try {
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

