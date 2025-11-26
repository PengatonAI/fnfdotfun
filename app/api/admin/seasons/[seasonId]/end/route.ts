import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/**
 * POST /api/admin/seasons/[seasonId]/end
 * 
 * Admin-only endpoint to end a tournament early.
 * Sets endAt to the current date/time.
 */
export async function POST(
  request: Request,
  { params }: { params: { seasonId: string } }
) {
  try {
    const { seasonId } = params;

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

    // 4. Update season endAt to now
    await prisma.season.update({
      where: { id: seasonId },
      data: {
        endAt: new Date(),
      },
    });

    // 5. Return success
    return NextResponse.json({ success: true }, { status: 200 });
  } catch (err) {
    console.error("Admin end season error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

