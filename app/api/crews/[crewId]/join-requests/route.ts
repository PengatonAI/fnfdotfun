import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// GET - List join requests for a crew (creator only)
export async function GET(
  request: Request,
  { params }: { params: Promise<{ crewId: string }> }
) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const { crewId } = await params;

    // Check if crew exists and user is creator
    const crew = await prisma.crew.findUnique({
      where: { id: crewId },
      select: {
        createdByUserId: true,
      },
    });

    if (!crew) {
      return NextResponse.json(
        { error: "Crew not found" },
        { status: 404 }
      );
    }

    if (crew.createdByUserId !== session.user.id) {
      return NextResponse.json(
        { error: "Only the crew creator can view join requests" },
        { status: 403 }
      );
    }

    // Get pending join requests
    const joinRequests = await prisma.crewJoinRequest.findMany({
      where: {
        crewId,
        status: "pending",
      },
      include: {
        user: {
          select: {
            id: true,
            name: true, // Keep for internal use only
            email: true,
            image: true,
            username: true,
            xHandle: true,
          },
        },
      },
      orderBy: {
        createdAt: "asc",
      },
    });

    return NextResponse.json(joinRequests);
  } catch (error) {
    console.error("Error fetching join requests:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

