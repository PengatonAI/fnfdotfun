import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// GET - List join requests for a crew (creator only)
export async function GET(
  request: Request,
  { params }: { params: Promise<{ crewId: string }> }
) {
  try {
    const { auth } = await import("@/lib/auth");
    const { prisma } = await import("@/lib/prisma");

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
            name: true,
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
