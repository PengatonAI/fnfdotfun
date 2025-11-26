import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// Common include for challenge queries
const challengeInclude = {
  fromCrew: {
    select: {
      id: true,
      name: true,
      avatarUrl: true,
      createdByUserId: true,
      createdBy: {
        select: {
          id: true,
          username: true,
          xHandle: true,
          image: true,
        },
      },
      members: {
        select: {
          userId: true,
        },
      },
    },
  },
  toCrew: {
    select: {
      id: true,
      name: true,
      avatarUrl: true,
      createdByUserId: true,
      createdBy: {
        select: {
          id: true,
          username: true,
          xHandle: true,
          image: true,
        },
      },
      members: {
        select: {
          userId: true,
        },
      },
    },
  },
  createdBy: {
    select: {
      id: true,
      username: true,
      xHandle: true,
      image: true,
    },
  },
  decidedBy: {
    select: {
      id: true,
      username: true,
      xHandle: true,
      image: true,
    },
  },
  winnerCrew: {
    select: {
      id: true,
      name: true,
      avatarUrl: true,
    },
  },
};

// POST /api/challenges/[challengeId]/decision - Accept or decline a challenge
export async function POST(
  request: Request,
  { params }: { params: Promise<{ challengeId: string }> }
) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const { challengeId } = await params;
    const body = await request.json();
    const { action } = body;

    // Validate action
    if (action !== "accept" && action !== "decline") {
      return NextResponse.json(
        { error: "Action must be 'accept' or 'decline'" },
        { status: 400 }
      );
    }

    // Fetch the challenge with related crews
    const challenge = await prisma.challenge.findUnique({
      where: { id: challengeId },
      include: {
        fromCrew: {
          select: {
            id: true,
            name: true,
            createdByUserId: true,
          },
        },
        toCrew: {
          select: {
            id: true,
            name: true,
            createdByUserId: true,
          },
        },
      },
    });

    if (!challenge) {
      return NextResponse.json(
        { error: "Challenge not found" },
        { status: 404 }
      );
    }

    // Ensure challenge is still pending
    if (challenge.status !== "pending") {
      return NextResponse.json(
        { error: `Challenge has already been ${challenge.status}` },
        { status: 400 }
      );
    }

    // Ensure current user is the creator of the toCrew (the one being challenged)
    if (challenge.toCrew.createdByUserId !== session.user.id) {
      return NextResponse.json(
        { error: "Only the creator of the challenged crew can accept or decline" },
        { status: 403 }
      );
    }

    const now = new Date();

    if (action === "accept") {
      // Calculate end time based on duration
      const endAt = new Date(now.getTime() + challenge.durationHours * 60 * 60 * 1000);

      const updatedChallenge = await prisma.challenge.update({
        where: { id: challengeId },
        data: {
          status: "active",
          startAt: now,
          endAt,
          decidedAt: now,
          decidedById: session.user.id,
        },
        include: challengeInclude,
      });

      return NextResponse.json({
        message: "Challenge accepted",
        challenge: updatedChallenge,
      });
    } else {
      // action === "decline"
      const updatedChallenge = await prisma.challenge.update({
        where: { id: challengeId },
        data: {
          status: "declined",
          decidedAt: now,
          decidedById: session.user.id,
        },
        include: challengeInclude,
      });

      return NextResponse.json({
        message: "Challenge declined",
        challenge: updatedChallenge,
      });
    }
  } catch (error) {
    console.error("Error processing challenge decision:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

