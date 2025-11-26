import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(
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

    // Check if crew exists
    const crew = await prisma.crew.findUnique({
      where: { id: crewId },
      include: {
        members: {
          orderBy: {
            joinedAt: "asc",
          },
        },
      },
    });

    if (!crew) {
      return NextResponse.json(
        { error: "Crew not found" },
        { status: 404 }
      );
    }

    // Check if user is a member
    const member = crew.members.find((m) => m.userId === session.user.id);

    if (!member) {
      return NextResponse.json(
        { error: "You are not a member of this crew" },
        { status: 403 }
      );
    }

    const isCreator = crew.createdByUserId === session.user.id;

    // Handle creator leaving - transfer ownership or delete crew
    if (isCreator) {
      const otherMembers = crew.members.filter(
        (m) => m.userId !== session.user.id
      );

      if (otherMembers.length === 0) {
        // Last member - delete crew (activities will be cascade deleted)
        await prisma.crew.delete({
          where: { id: crewId },
        });

        return NextResponse.json({
          message: "Crew deleted as you were the last member",
          deleted: true,
        });
      } else {
        // Transfer ownership to the next earliest member
        const newCreator = otherMembers[0];

        // Get user info for activity log
        const user = await prisma.user.findUnique({
          where: { id: session.user.id },
          select: { username: true, xHandle: true },
        });

        const displayName = user?.username || session.user.email || "User";
        const activityMessage = user?.xHandle 
          ? `${displayName} (@${user.xHandle}) left the crew`
          : `${displayName} left the crew`;

        await prisma.$transaction([
          prisma.crew.update({
            where: { id: crewId },
            data: {
              createdByUserId: newCreator.userId,
            },
          }),
          prisma.crewMember.delete({
            where: {
              crewId_userId: {
                crewId,
                userId: session.user.id,
              },
            },
          }),
          prisma.crewActivity.create({
            data: {
              crewId,
              userId: session.user.id,
              type: "left",
              message: activityMessage,
            },
          }),
        ]);

        return NextResponse.json({
          message: "Ownership transferred and you have left the crew",
          newCreatorId: newCreator.userId,
        });
      }
    } else {
      // Regular member leaving
      // Get user info for activity log
      const user = await prisma.user.findUnique({
        where: { id: session.user.id },
        select: { username: true, xHandle: true },
      });

      const displayName = user?.username || session.user.email || "User";
      const activityMessage = user?.xHandle 
        ? `${displayName} (@${user.xHandle}) left the crew`
        : `${displayName} left the crew`;

      await prisma.$transaction([
        prisma.crewMember.delete({
          where: {
            crewId_userId: {
              crewId,
              userId: session.user.id,
            },
          },
        }),
        prisma.crewActivity.create({
          data: {
            crewId,
            userId: session.user.id,
            type: "left",
            message: activityMessage,
          },
        }),
      ]);

      return NextResponse.json({
        message: "You have left the crew",
      });
    }
  } catch (error) {
    console.error("Error leaving crew:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

