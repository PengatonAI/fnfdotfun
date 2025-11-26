import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(
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

    if (!crewId) {
      return NextResponse.json(
        { error: "Crew ID is required" },
        { status: 400 }
      );
    }

    // Check if crew exists
    const crew = await prisma.crew.findUnique({
      where: { id: crewId },
    });

    if (!crew) {
      return NextResponse.json(
        { error: "Crew not found" },
        { status: 404 }
      );
    }

    // Check if user is already a member
    const existingMember = await prisma.crewMember.findUnique({
      where: {
        crewId_userId: {
          crewId,
          userId: session.user.id,
        },
      },
    });

    if (existingMember) {
      return NextResponse.json(
        { error: "You are already a member of this crew" },
        { status: 409 }
      );
    }

    // Get user info for activity log
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { username: true, xHandle: true },
    });

    const displayName = user?.username || session.user.email || "User";
    const activityMessage = user?.xHandle 
      ? `${displayName} (@${user.xHandle}) joined the crew`
      : `${displayName} joined the crew`;

    // Add user to crew and log activity
    await prisma.$transaction([
      prisma.crewMember.create({
        data: {
          crewId,
          userId: session.user.id,
        },
      }),
      prisma.crewActivity.create({
        data: {
          crewId,
          userId: session.user.id,
          type: "joined",
          message: activityMessage,
        },
      }),
    ]);

    // Fetch updated crew with members
    const updatedCrew = await prisma.crew.findUnique({
      where: { id: crewId },
      include: {
        createdBy: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true,
            username: true,
          },
        },
        members: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                image: true,
                username: true,
              },
            },
          },
          orderBy: {
            joinedAt: "asc",
          },
        },
      },
    });

    return NextResponse.json(updatedCrew);
  } catch (error) {
    console.error("Error joining crew:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
