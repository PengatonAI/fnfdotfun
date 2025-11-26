import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { finalizeOverdueChallenges } from "@/lib/challenges/finalize-challenge";

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

// GET /api/challenges - List challenges for the current user
export async function GET(request: Request) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Auto-finalize any overdue active challenges before fetching
    // This ensures challenges are completed even if no one views them
    try {
      await finalizeOverdueChallenges(prisma);
    } catch (error) {
      // Log but don't fail the request if finalization fails
      console.error("Error finalizing overdue challenges:", error);
    }

    const { searchParams } = new URL(request.url);
    const scope = searchParams.get("scope") || "all";
    const status = searchParams.get("status");

    // Validate scope parameter
    if (!["incoming", "outgoing", "all"].includes(scope)) {
      return NextResponse.json(
        { error: "Invalid scope. Must be 'incoming', 'outgoing', or 'all'" },
        { status: 400 }
      );
    }

    // Find all crews where the current user is the creator
    const userCreatedCrews = await prisma.crew.findMany({
      where: {
        createdByUserId: session.user.id,
      },
      select: {
        id: true,
      },
    });

    const userCrewIds = userCreatedCrews.map((crew) => crew.id);

    // If user has no crews, return empty array
    if (userCrewIds.length === 0) {
      return NextResponse.json([]);
    }

    // Build where clause based on scope
    let whereClause: any = {};

    if (scope === "incoming") {
      whereClause = {
        toCrewId: { in: userCrewIds },
      };
    } else if (scope === "outgoing") {
      whereClause = {
        fromCrewId: { in: userCrewIds },
      };
    } else {
      // scope === "all"
      whereClause = {
        OR: [
          { fromCrewId: { in: userCrewIds } },
          { toCrewId: { in: userCrewIds } },
        ],
      };
    }

    // Add status filter if provided
    if (status) {
      whereClause = {
        AND: [
          whereClause,
          { status },
        ],
      };
    }

    const challenges = await prisma.challenge.findMany({
      where: whereClause,
      include: challengeInclude,
      orderBy: {
        createdAt: "desc",
      },
    });

    return NextResponse.json(challenges);
  } catch (error) {
    console.error("Error fetching challenges:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// POST /api/challenges - Create a new challenge
export async function POST(request: Request) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const body = await request.json();
    const {
      fromCrewId,
      toCrewId,
      durationHours,
      type = "pnl",
      visibility = "public",
    } = body;

    // Validate required fields
    if (!fromCrewId || typeof fromCrewId !== "string") {
      return NextResponse.json(
        { error: "fromCrewId is required" },
        { status: 400 }
      );
    }

    if (!toCrewId || typeof toCrewId !== "string") {
      return NextResponse.json(
        { error: "toCrewId is required" },
        { status: 400 }
      );
    }

    if (!durationHours || typeof durationHours !== "number" || durationHours <= 0) {
      return NextResponse.json(
        { error: "durationHours must be a positive number" },
        { status: 400 }
      );
    }

    // Validate type
    if (type && !["pnl"].includes(type)) {
      return NextResponse.json(
        { error: "Invalid challenge type. Currently only 'pnl' is supported" },
        { status: 400 }
      );
    }

    // Validate visibility
    if (visibility && !["public", "private"].includes(visibility)) {
      return NextResponse.json(
        { error: "Invalid visibility. Must be 'public' or 'private'" },
        { status: 400 }
      );
    }

    // Cannot challenge yourself
    if (fromCrewId === toCrewId) {
      return NextResponse.json(
        { error: "A crew cannot challenge itself" },
        { status: 400 }
      );
    }

    // Validate fromCrew exists and user is the creator
    const fromCrew = await prisma.crew.findUnique({
      where: { id: fromCrewId },
      select: {
        id: true,
        createdByUserId: true,
        name: true,
      },
    });

    if (!fromCrew) {
      return NextResponse.json(
        { error: "From crew not found" },
        { status: 404 }
      );
    }

    if (fromCrew.createdByUserId !== session.user.id) {
      return NextResponse.json(
        { error: "Only the crew creator can create challenges" },
        { status: 403 }
      );
    }

    // Validate toCrew exists
    const toCrew = await prisma.crew.findUnique({
      where: { id: toCrewId },
      select: {
        id: true,
        name: true,
      },
    });

    if (!toCrew) {
      return NextResponse.json(
        { error: "To crew not found" },
        { status: 404 }
      );
    }

    // Check for duplicate pending challenges between the same crews
    const existingChallenge = await prisma.challenge.findFirst({
      where: {
        OR: [
          { fromCrewId, toCrewId },
          { fromCrewId: toCrewId, toCrewId: fromCrewId },
        ],
        status: "pending",
      },
    });

    if (existingChallenge) {
      return NextResponse.json(
        { error: "A pending challenge already exists between these crews" },
        { status: 409 }
      );
    }

    // Also check for active challenges between the same crews
    const activeChallenge = await prisma.challenge.findFirst({
      where: {
        OR: [
          { fromCrewId, toCrewId },
          { fromCrewId: toCrewId, toCrewId: fromCrewId },
        ],
        status: "active",
      },
    });

    if (activeChallenge) {
      return NextResponse.json(
        { error: "An active challenge already exists between these crews" },
        { status: 409 }
      );
    }

    // Create the challenge
    const challenge = await prisma.challenge.create({
      data: {
        fromCrewId,
        toCrewId,
        createdById: session.user.id,
        status: "pending",
        type,
        visibility,
        durationHours,
      },
      include: challengeInclude,
    });

    return NextResponse.json(challenge, { status: 201 });
  } catch (error) {
    console.error("Error creating challenge:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

