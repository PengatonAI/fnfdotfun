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
    const body = await request.json();
    const { userId } = body;

    if (!userId || typeof userId !== "string") {
      return NextResponse.json(
        { error: "User ID is required" },
        { status: 400 }
      );
    }

    // Check if crew exists and user is creator
    const crew = await prisma.crew.findUnique({
      where: { id: crewId },
      include: {
        members: true,
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
        { error: "Only the crew creator can kick members" },
        { status: 403 }
      );
    }

    // Check if trying to kick creator
    if (userId === crew.createdByUserId) {
      return NextResponse.json(
        { error: "Creator cannot be kicked" },
        { status: 400 }
      );
    }

    // Check if user is a member
    const memberToKick = crew.members.find((m) => m.userId === userId);

    if (!memberToKick) {
      return NextResponse.json(
        { error: "User is not a member of this crew" },
        { status: 404 }
      );
    }

    // Get user info for activity log
    const userToKick = await prisma.user.findUnique({
      where: { id: userId },
      select: { username: true, xHandle: true, email: true },
    });

    const displayName = userToKick?.username || userToKick?.email || "User";
    const activityMessage = userToKick?.xHandle 
      ? `${displayName} (@${userToKick.xHandle}) was removed from the crew`
      : `${displayName} was removed from the crew`;

    // Remove member and log activity
    await prisma.$transaction([
      prisma.crewMember.delete({
        where: {
          crewId_userId: {
            crewId,
            userId,
          },
        },
      }),
      prisma.crewActivity.create({
        data: {
          crewId,
          userId: session.user.id,
          type: "kicked",
          message: activityMessage,
        },
      }),
    ]);

    // Fetch updated crew
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
    console.error("Error kicking member:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
