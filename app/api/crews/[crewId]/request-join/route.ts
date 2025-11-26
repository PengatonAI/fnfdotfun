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
        members: true,
      },
    });

    if (!crew) {
      return NextResponse.json(
        { error: "Crew not found" },
        { status: 404 }
      );
    }

    // Check if crew is open to members
    if (!crew.openToMembers) {
      return NextResponse.json(
        { error: "This crew is invite-only. You need an invite link to join." },
        { status: 403 }
      );
    }

    // Check if user is already in a crew
    const userCrews = await prisma.crewMember.findMany({
      where: {
        userId: session.user.id,
      },
    });

    if (userCrews.length > 0) {
      return NextResponse.json(
        { error: "You can only belong to one crew at a time. Please leave your current crew first." },
        { status: 409 }
      );
    }

    // Check if crew is full
    if (crew.members.length >= 5) {
      return NextResponse.json(
        { error: "Crew is full (maximum 5 members)" },
        { status: 400 }
      );
    }

    // Check if user is already a member
    const existingMember = crew.members.find(
      (m) => m.userId === session.user.id
    );

    if (existingMember) {
      return NextResponse.json(
        { error: "You are already a member of this crew" },
        { status: 409 }
      );
    }

    // Check if a join request already exists for this user and crew
    const existingRequest = await prisma.crewJoinRequest.findUnique({
      where: {
        userId_crewId_unique: {
          userId: session.user.id,
          crewId,
        },
      },
    });

    let joinRequest;

    if (existingRequest) {
      // If request exists
      if (existingRequest.status === "pending") {
        // Already pending - return error
        return NextResponse.json(
          { error: "You already have a pending request to join this crew" },
          { status: 409 }
        );
      } else {
        // Request was previously accepted or rejected - reset it to pending
        joinRequest = await prisma.crewJoinRequest.update({
          where: {
            id: existingRequest.id,
          },
          data: {
            status: "pending",
            decidedAt: null,
            decidedBy: null,
            createdAt: new Date(), // Update creation time for new request
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
        });
      }
    } else {
      // No existing request - create new one
      joinRequest = await prisma.crewJoinRequest.create({
        data: {
          userId: session.user.id,
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
            },
          },
        },
      });
    }

    return NextResponse.json(joinRequest, { status: 201 });
  } catch (error) {
    console.error("Error creating join request:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

