import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { finalizeChallenge, isChallengeOverdue } from "@/lib/challenges/finalize-challenge";

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

// GET /api/challenges/[challengeId] - Get a single challenge
export async function GET(
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

    let challenge = await prisma.challenge.findUnique({
      where: { id: challengeId },
      include: challengeInclude,
    });

    if (!challenge) {
      return NextResponse.json(
        { error: "Challenge not found" },
        { status: 404 }
      );
    }

    // Auto-finalize if the challenge is active and overdue
    if (isChallengeOverdue(challenge)) {
      try {
        // Fetch challenge with member data for finalization
        const challengeForFinalization = await prisma.challenge.findUnique({
          where: { id: challengeId },
          include: {
            fromCrew: {
              select: {
                id: true,
                name: true,
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
                members: {
                  select: {
                    userId: true,
                  },
                },
              },
            },
          },
        });

        if (challengeForFinalization) {
          await finalizeChallenge(prisma, challengeForFinalization);
          
          // Re-fetch the updated challenge
          challenge = await prisma.challenge.findUnique({
            where: { id: challengeId },
            include: challengeInclude,
          });

          if (!challenge) {
            return NextResponse.json(
              { error: "Challenge not found after finalization" },
              { status: 404 }
            );
          }
        }
      } catch (error) {
        console.error("Error finalizing overdue challenge:", error);
        // Continue with the original challenge data
      }
    }

    // Ensure challenge is still valid after any auto-finalization attempt
    if (!challenge) {
      return NextResponse.json(
        { error: "Challenge not found" },
        { status: 404 }
      );
    }

    // Check if the current user is related to this challenge
    // They must be either:
    // 1. Creator of fromCrew
    // 2. Creator of toCrew
    // 3. Member of either crew
    const isFromCrewCreator = challenge.fromCrew.createdByUserId === session.user.id;
    const isToCrewCreator = challenge.toCrew.createdByUserId === session.user.id;
    const isFromCrewMember = challenge.fromCrew.members.some(
      (member) => member.userId === session.user.id
    );
    const isToCrewMember = challenge.toCrew.members.some(
      (member) => member.userId === session.user.id
    );

    const isRelated = isFromCrewCreator || isToCrewCreator || isFromCrewMember || isToCrewMember;

    if (!isRelated) {
      return NextResponse.json(
        { error: "You are not authorized to view this challenge" },
        { status: 403 }
      );
    }

    return NextResponse.json(challenge);
  } catch (error) {
    console.error("Error fetching challenge:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

