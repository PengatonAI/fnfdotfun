import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ crewId: string; requestId: string }> }
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

    const { crewId, requestId } = await params;
    const body = await request.json();
    const { action } = body;

    if (action !== "approve" && action !== "reject") {
      return NextResponse.json(
        { error: "Action must be 'approve' or 'reject'" },
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
        { error: "Only the crew creator can approve or reject join requests" },
        { status: 403 }
      );
    }

    // Find the join request
    const joinRequest = await prisma.crewJoinRequest.findUnique({
      where: { id: requestId },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            xHandle: true,
            email: true,
          },
        },
      },
    });

    if (!joinRequest) {
      return NextResponse.json(
        { error: "Join request not found" },
        { status: 404 }
      );
    }

    if (joinRequest.crewId !== crewId) {
      return NextResponse.json(
        { error: "Join request does not belong to this crew" },
        { status: 400 }
      );
    }

    if (joinRequest.status !== "pending") {
      return NextResponse.json(
        { error: `This request has already been ${joinRequest.status}` },
        { status: 400 }
      );
    }

    if (action === "approve") {
      // Re-check conditions before approving
      if (crew.members.length >= 5) {
        return NextResponse.json(
          { error: "Crew is now full. Cannot approve this request." },
          { status: 400 }
        );
      }

      // Check if user is still not in another crew
      const userCrews = await prisma.crewMember.findMany({
        where: {
          userId: joinRequest.userId,
        },
      });

      if (userCrews.length > 0) {
        return NextResponse.json(
          { error: "User is already in another crew. Cannot approve this request." },
          { status: 400 }
        );
      }

      // Check if user is already a member
      const existingMember = crew.members.find(
        (m) => m.userId === joinRequest.userId
      );

      if (existingMember) {
        return NextResponse.json(
          { error: "User is already a member of this crew" },
          { status: 409 }
        );
      }

      // Get user info for activity log
      const joiningUser = await prisma.user.findUnique({
        where: { id: joinRequest.userId },
        select: { username: true, xHandle: true, email: true },
      });

      const displayName = joiningUser?.username || joiningUser?.email || "User";
      const activityMessage = joiningUser?.xHandle 
        ? `${displayName} (@${joiningUser.xHandle}) joined the crew`
        : `${displayName} joined the crew`;

      // Add user to crew, update request, and log activity in a transaction
      await prisma.$transaction([
        prisma.crewMember.create({
          data: {
            crewId,
            userId: joinRequest.userId,
          },
        }),
        prisma.crewJoinRequest.update({
          where: { id: requestId },
          data: {
            status: "accepted",
            decidedAt: new Date(),
            decidedBy: session.user.id,
          },
        }),
        prisma.crewActivity.create({
          data: {
            crewId,
            userId: joinRequest.userId,
            type: "joined",
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

      return NextResponse.json({
        message: "Join request approved",
        crew: updatedCrew,
      });
    } else {
      // Reject the request
      await prisma.crewJoinRequest.update({
        where: { id: requestId },
        data: {
          status: "rejected",
          decidedAt: new Date(),
          decidedBy: session.user.id,
        },
      });

      return NextResponse.json({
        message: "Join request rejected",
      });
    }
  } catch (error) {
    console.error("Error processing join request decision:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
