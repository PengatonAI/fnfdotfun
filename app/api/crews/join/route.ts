import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(request: Request) {
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

    const body = await request.json();
    const { token, crewId } = body;

    if (!token || typeof token !== "string") {
      return NextResponse.json(
        { error: "Invite token is required" },
        { status: 400 }
      );
    }

    if (!crewId || typeof crewId !== "string") {
      return NextResponse.json(
        { error: "Crew ID is required" },
        { status: 400 }
      );
    }

    // Find and validate invite token
    const inviteToken = await prisma.inviteToken.findUnique({
      where: { token },
      include: {
        crew: {
          include: {
            members: true,
          },
        },
      },
    });

    if (!inviteToken) {
      return NextResponse.json(
        { error: "Invalid invite token" },
        { status: 404 }
      );
    }

    // Check if token belongs to the crew
    if (inviteToken.crewId !== crewId) {
      return NextResponse.json(
        { error: "Token does not belong to this crew" },
        { status: 400 }
      );
    }

    // Check if token is expired
    if (new Date() > inviteToken.expiresAt) {
      return NextResponse.json(
        { error: "Invite token has expired" },
        { status: 400 }
      );
    }

    // Check if crew is full (max 5 members)
    if (inviteToken.crew.members.length >= 5) {
      return NextResponse.json(
        { error: "Crew is full (maximum 5 members)" },
        { status: 400 }
      );
    }

    // Check if user is already in this crew
    const existingMember = inviteToken.crew.members.find(
      (m) => m.userId === session.user.id
    );

    if (existingMember) {
      return NextResponse.json(
        { error: "You are already a member of this crew" },
        { status: 409 }
      );
    }

    // Check if user is already in another crew
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

    // Add user to crew
    await prisma.crewMember.create({
      data: {
        crewId,
        userId: session.user.id,
      },
    });

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
    console.error("Error joining crew:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
