import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// GET /api/challenges/unread-count - Get count of pending incoming challenges
export async function GET() {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Find all crews where the current user is the creator
    const userCreatedCrews = await prisma.crew.findMany({
      where: {
        createdByUserId: session.user.id,
      },
      select: {
        id: true,
      },
    });

    const userCrewIds = userCreatedCrews.map((crew) => crew.id);

    // If user has no crews, return 0
    if (userCrewIds.length === 0) {
      return NextResponse.json({ pendingIncoming: 0 });
    }

    // Count challenges where toCrew is one of the user's created crews and status is pending
    const pendingIncoming = await prisma.challenge.count({
      where: {
        toCrewId: { in: userCrewIds },
        status: "pending",
      },
    });

    return NextResponse.json({ pendingIncoming });
  } catch (error) {
    console.error("Error fetching unread challenge count:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

