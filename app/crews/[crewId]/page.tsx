import { Navbar } from "@/components/navbar";
import { redirect, notFound } from "next/navigation";
import CrewDetailsClient from "./crew-details-client";

export const dynamic = "force-dynamic";

export default async function CrewDetailsPage({
  params,
}: {
  params: Promise<{ crewId: string }>;
}) {
  // Dynamic imports to avoid build-time initialization
  const { auth } = await import("@/lib/auth");
  const { prisma } = await import("@/lib/prisma");

  const session = await auth();

  if (!session?.user?.id) {
    redirect("/login");
  }

  const { crewId } = await params;

  // Fetch crew with members
  const crew = await prisma.crew.findUnique({
    where: { id: crewId },
    include: {
      createdBy: {
        select: {
          id: true,
          name: true, // Keep for internal use only
          email: true,
          image: true,
          username: true,
          xHandle: true,
        },
      },
      members: {
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
        orderBy: {
          joinedAt: "asc",
        },
      },
    },
  });

  if (!crew) {
    notFound();
  }

  const isCreator = crew.createdByUserId === session.user.id;
  const isMember = crew.members.some((m) => m.userId === session.user.id);

  // Fetch join requests if creator
  let joinRequests: any[] = [];
  if (isCreator) {
    joinRequests = await prisma.crewJoinRequest.findMany({
      where: {
        crewId: crew.id,
        status: "pending",
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
      orderBy: {
        createdAt: "asc",
      },
    });
  }

  // Check if user has pending request
  let hasPendingRequest = false;
  if (!isMember && !isCreator) {
    const pendingRequest = await prisma.crewJoinRequest.findFirst({
      where: {
        userId: session.user.id,
        crewId: crew.id,
        status: "pending",
      },
    });
    hasPendingRequest = !!pendingRequest;
  }

  // Check if user is in another crew
  let isInAnotherCrew = false;
  if (!isMember) {
    const userCrews = await prisma.crewMember.findMany({
      where: {
        userId: session.user.id,
      },
    });
    isInAnotherCrew = userCrews.length > 0;
  }

  // Fetch recent activities (last 5)
  const activities = await prisma.crewActivity.findMany({
    where: {
      crewId: crew.id,
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
    orderBy: {
      createdAt: "desc",
    },
    take: 5,
  });

  // Fetch crew member trades for initial load
  const memberUserIds = crew.members.map((m) => m.userId);
  
  const recentTrades = await prisma.trade.findMany({
    where: {
      userId: { in: memberUserIds },
    },
    orderBy: { timestamp: "desc" },
    take: 10,
    select: {
      id: true,
      chain: true,
      timestamp: true,
      direction: true,
      tokenOutSymbol: true,
      tokenInSymbol: true,
      normalizedAmountOut: true,
      price: true,
      nativePrice: true,
      usdPricePerToken: true,
      usdValue: true,
      walletAddress: true,
      txHash: true,
      raw: true,
      userId: true,
    },
  });

  // Create user map for trades
  const userMap = new Map(
    crew.members.map((m) => [m.userId, { 
      username: m.user.username, 
      image: m.user.image 
    }])
  );

  // Serialize trades with user info
  const serializedTrades = recentTrades.map((trade) => ({
    ...trade,
    timestamp: trade.timestamp.toISOString(),
    user: userMap.get(trade.userId) || null,
  }));

  // Compute sparkline data for crew performance
  const allCrewTrades = await prisma.trade.findMany({
    where: {
      userId: { in: memberUserIds },
    },
    orderBy: { timestamp: "asc" },
    select: {
      timestamp: true,
      usdValue: true,
      direction: true,
    },
  });

  let sparklineData: number[] | undefined = undefined;

  if (allCrewTrades.length > 0) {
    // Group trades by day and compute cumulative PnL
    const dailyPnL: Map<string, number> = new Map();

    for (const trade of allCrewTrades) {
      const dateKey = trade.timestamp.toISOString().split("T")[0];
      const currentDayPnL = dailyPnL.get(dateKey) || 0;
      // Estimate PnL contribution
      const pnlContribution =
        trade.direction === "SELL"
          ? (trade.usdValue || 0) * 0.1
          : -(trade.usdValue || 0) * 0.05;
      dailyPnL.set(dateKey, currentDayPnL + pnlContribution);
    }

    // Convert to cumulative sparkline data
    const sortedDays = Array.from(dailyPnL.keys()).sort();
    let cumulativePnL = 0;
    const cumulativeData: number[] = [];

    for (const day of sortedDays) {
      cumulativePnL += dailyPnL.get(day) || 0;
      cumulativeData.push(cumulativePnL);
    }

    // Take last 30 points for the sparkline
    sparklineData = cumulativeData.slice(-30);

    // Ensure we have at least 2 points
    if (sparklineData.length === 1) {
      sparklineData = [0, sparklineData[0]];
    }
  }

  // Serialize crew to match the expected interface (convert Date to string)
  const serializedCrew = {
    ...crew,
    createdAt: crew.createdAt.toISOString(),
    updatedAt: crew.updatedAt.toISOString(),
    members: crew.members.map((member) => ({
      ...member,
      joinedAt: member.joinedAt.toISOString(),
    })),
  };

  // Serialize activities to match the expected interface (convert Date to string)
  const serializedActivities = activities.map((activity) => ({
    ...activity,
    createdAt: activity.createdAt.toISOString(),
  }));

  return (
    <>
      <Navbar />
      <div className="min-h-screen bg-bg-main">
        <div className="container mx-auto px-4 py-8 max-w-7xl">
          <CrewDetailsClient
            crew={serializedCrew as any}
            currentUserId={session.user.id}
            isCreator={isCreator}
            isMember={isMember}
            joinRequests={joinRequests}
            hasPendingRequest={hasPendingRequest}
            isInAnotherCrew={isInAnotherCrew}
            activities={serializedActivities as any}
            crewTrades={serializedTrades as any}
            sparklineData={sparklineData}
          />
        </div>
      </div>
    </>
  );
}
