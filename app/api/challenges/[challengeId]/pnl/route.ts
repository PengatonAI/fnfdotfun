import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

interface MemberPnL {
  userId: string;
  username: string | null;
  image: string | null;
  realizedPnl: number;
  totalPnl: number;
  volume: number;
  totalTrades: number;
}

interface CrewPnLSnapshot {
  crewId: string;
  crewName: string;
  avatarUrl: string | null;
  totalPnl: number;
  realizedPnl: number;
  volume: number;
  totalTrades: number;
  members: MemberPnL[];
}

// GET /api/challenges/[challengeId]/pnl - Get live PnL snapshot for an active challenge
export async function GET(
  request: Request,
  { params }: { params: Promise<{ challengeId: string }> }
) {
  try {
    // Dynamic imports to prevent build-time initialization
    const { auth } = await import("@/lib/auth");
    const { prisma } = await import("@/lib/prisma");
    const { computePnL } = await import("@/lib/pnl/engine");
    const { filterTrades } = await import("@/lib/leaderboard/engine");

    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const { challengeId } = await params;

    // Fetch challenge with full crew and member details
    const challenge = await prisma.challenge.findUnique({
      where: { id: challengeId },
      include: {
        fromCrew: {
          select: {
            id: true,
            name: true,
            avatarUrl: true,
            createdByUserId: true,
            members: {
              include: {
                user: {
                  select: {
                    id: true,
                    username: true,
                    image: true,
                  },
                },
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
            members: {
              include: {
                user: {
                  select: {
                    id: true,
                    username: true,
                    image: true,
                  },
                },
              },
            },
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

    // Check if user is related to this challenge
    const isFromCrewMember = challenge.fromCrew.members.some(
      (m) => m.user.id === session.user.id
    );
    const isToCrewMember = challenge.toCrew.members.some(
      (m) => m.user.id === session.user.id
    );
    const isFromCrewCreator = challenge.fromCrew.createdByUserId === session.user.id;
    const isToCrewCreator = challenge.toCrew.createdByUserId === session.user.id;

    const isRelated = isFromCrewMember || isToCrewMember || isFromCrewCreator || isToCrewCreator;

    if (!isRelated) {
      return NextResponse.json(
        { error: "You are not authorized to view this challenge" },
        { status: 403 }
      );
    }

    // Verify challenge is active
    if (challenge.status !== "active") {
      return NextResponse.json(
        { error: `Challenge is ${challenge.status}, not active` },
        { status: 400 }
      );
    }

    // Verify challenge has start time
    if (!challenge.startAt) {
      return NextResponse.json(
        { error: "Challenge has no start time" },
        { status: 400 }
      );
    }

    const now = new Date();
    const startAt = new Date(challenge.startAt);
    const endAt = challenge.endAt ? new Date(challenge.endAt) : null;

    // Helper function to calculate PnL for a crew
    const calculateCrewSnapshot = async (
      crew: typeof challenge.fromCrew
    ): Promise<CrewPnLSnapshot> => {
      const memberPnLs: MemberPnL[] = [];
      let crewTotalPnl = 0;
      let crewRealizedPnl = 0;
      let crewVolume = 0;
      let crewTotalTrades = 0;

      for (const member of crew.members) {
        // Fetch trades for this member
        const trades = await prisma.trade.findMany({
          where: { userId: member.user.id },
          orderBy: { timestamp: "asc" },
        });

        // Filter trades to [startAt, now]
        const filteredTrades = filterTrades(trades, {
          startDate: startAt,
          endDate: now,
        });

        // Compute PnL
        const pnl = computePnL(filteredTrades, {});

        memberPnLs.push({
          userId: member.user.id,
          username: member.user.username,
          image: member.user.image,
          realizedPnl: pnl.realizedPnL,
          totalPnl: pnl.totalPnL,
          volume: pnl.metrics.volume,
          totalTrades: pnl.metrics.totalTrades,
        });

        crewTotalPnl += pnl.totalPnL;
        crewRealizedPnl += pnl.realizedPnL;
        crewVolume += pnl.metrics.volume;
        crewTotalTrades += pnl.metrics.totalTrades;
      }

      // Sort members by PnL descending
      memberPnLs.sort((a, b) => b.realizedPnl - a.realizedPnl);

      return {
        crewId: crew.id,
        crewName: crew.name,
        avatarUrl: crew.avatarUrl,
        totalPnl: crewTotalPnl,
        realizedPnl: crewRealizedPnl,
        volume: crewVolume,
        totalTrades: crewTotalTrades,
        members: memberPnLs,
      };
    };

    // Calculate PnL for both crews in parallel
    const [fromCrewSnapshot, toCrewSnapshot] = await Promise.all([
      calculateCrewSnapshot(challenge.fromCrew),
      calculateCrewSnapshot(challenge.toCrew),
    ]);

    return NextResponse.json({
      fromCrew: fromCrewSnapshot,
      toCrew: toCrewSnapshot,
      now: now.toISOString(),
      startAt: startAt.toISOString(),
      endAt: endAt?.toISOString() || null,
      challengeId: challenge.id,
      status: challenge.status,
    });
  } catch (error) {
    console.error("Error fetching challenge PnL:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
