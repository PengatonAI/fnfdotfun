import { Navbar } from "@/components/navbar";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getCurrentSeason } from "@/lib/seasons/utils";
import { computePnL } from "@/lib/pnl/engine";
import { computeSeasonCrewLeaderboard } from "@/lib/leaderboard/season-crew-engine";
import { getSeasonTimeWindow } from "@/lib/seasons/utils";
import { buildUserLeaderboardEntries } from "@/lib/leaderboard/engine";
import { DashboardPnLCard } from "./dashboard-pnl-card";
import { CrewDashboardCard } from "./components/crew-dashboard-card";
import { StatsDashboardCard } from "./components/stats-dashboard-card";
import { LeaderboardSnapshotCard } from "./components/leaderboard-snapshot-card";
import { RecentTradesTable } from "./components/recent-trades-table";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const session = await auth();

  if (!session?.user?.id) {
    redirect("/login");
  }

  const userId = session.user.id;

  // 1. Fetch user from Prisma
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      username: true,
      image: true,
      xHandle: true,
      name: true,
      email: true,
    },
  });

  if (!user) {
    redirect("/login");
  }

  // 2. Fetch user's crew
  const crewMember = await prisma.crewMember.findFirst({
    where: { userId },
    include: {
      crew: {
        select: {
          id: true,
          name: true,
          avatarUrl: true,
          createdBy: {
            select: {
              id: true,
              username: true,
              name: true,
            },
          },
        },
      },
    },
  });

  // 3. Fetch current season
  const currentSeason = await getCurrentSeason(prisma);

  // 4. Compute season PnL if season exists
  let seasonPnL: {
    realizedPnl: number;
    totalPnl: number;
    winRate: number;
    totalTrades: number;
    volume: number;
  } | null = null;

  let crewRank: number | null = null;

  if (currentSeason) {
    // Fetch snapshot for this user and season
    const snapshot = await prisma.seasonUserSnapshot.findUnique({
      where: {
        seasonId_userId: {
          seasonId: currentSeason.id,
          userId: userId,
        },
      },
    });

    // Fetch all user trades (needed for accurate FIFO calculation)
    const allTrades = await prisma.trade.findMany({
      where: { userId },
      orderBy: { timestamp: "asc" },
    });

    // Compute current PnL from all trades
    const currentPnL = computePnL(allTrades, {});

    // Compute season metrics using snapshot
    const baselineSnapshot = snapshot || {
      id: "",
      seasonId: currentSeason.id,
      userId: userId,
      realizedPnl: 0,
      totalPnl: 0,
      volume: 0,
      totalTrades: 0,
      createdAt: new Date(),
    };

    const seasonRealizedPnl = currentPnL.realizedPnL - baselineSnapshot.realizedPnl;
    const seasonTotalPnl = currentPnL.totalPnL - baselineSnapshot.totalPnl;
    const seasonVolume = currentPnL.metrics.volume - baselineSnapshot.volume;
    const seasonTotalTrades = currentPnL.metrics.totalTrades - baselineSnapshot.totalTrades;

    seasonPnL = {
      realizedPnl: seasonRealizedPnl,
      totalPnl: seasonTotalPnl,
      winRate: currentPnL.metrics.winRate,
      totalTrades: seasonTotalTrades,
      volume: seasonVolume,
    };

    // 5. Fetch crew rank if user is in a crew
    if (crewMember?.crew) {
      const { startDate, endDate } = getSeasonTimeWindow(currentSeason);
      
      // Fetch season snapshots
      const snapshots = await prisma.seasonUserSnapshot.findMany({
        where: { seasonId: currentSeason.id },
      });

      // Fetch users with trades in season timeframe
      const tradeFilter = {
        timestamp: {
          gte: startDate,
          lte: endDate,
        },
      };

      const users = await prisma.user.findMany({
        where: {
          trades: {
            some: tradeFilter,
          },
        },
        select: {
          id: true,
        },
        take: 1000,
      });

      const userIds = users.map((u) => u.id);

      // Fetch all trades for those users
      const allUserTrades = await prisma.trade.findMany({
        where: {
          userId: { in: userIds },
        },
        orderBy: { timestamp: "asc" },
      });

      // Group trades by userId
      const tradesByUserId: Record<string, typeof allUserTrades> = {};
      for (const trade of allUserTrades) {
        if (!tradesByUserId[trade.userId]) {
          tradesByUserId[trade.userId] = [];
        }
        tradesByUserId[trade.userId].push(trade);
      }

      // Fetch crews with members
      const crews = await prisma.crew.findMany({
        select: {
          id: true,
          name: true,
          avatarUrl: true,
          members: {
            select: {
              userId: true,
            },
          },
        },
      });

      // Compute crew leaderboard
      const crewEntries = await computeSeasonCrewLeaderboard({
        season: currentSeason,
        snapshots,
        tradesByUserId,
        crews,
        metric: "realizedPnl",
      });

      // Find crew rank
      const crewIndex = crewEntries.findIndex((entry) => entry.crewId === crewMember.crew.id);
      crewRank = crewIndex >= 0 ? crewIndex + 1 : null;
    }
  }

  // 6. Fetch active tournaments
  const now = new Date();
  const activeTournaments = await prisma.season.findMany({
    where: {
      isTournament: true,
      startAt: { lte: now },
      endAt: { gte: now },
    },
    orderBy: {
      startAt: "desc",
    },
  });

  // Check user and crew participation in tournaments
  const tournamentsWithParticipation = await Promise.all(
    activeTournaments.map(async (tournament) => {
      const userParticipant = await prisma.tournamentParticipant.findUnique({
        where: {
          seasonId_userId: {
            seasonId: tournament.id,
            userId: userId,
          },
        },
      });

      let crewParticipant = null;
      if (crewMember?.crew) {
        crewParticipant = await prisma.tournamentCrewParticipant.findUnique({
          where: {
            seasonId_crewId: {
              seasonId: tournament.id,
              crewId: crewMember.crew.id,
            },
          },
        });
      }

      return {
        ...tournament,
        userJoined: !!userParticipant,
        crewJoined: !!crewParticipant,
      };
    })
  );

  // 7. Fetch leaderboard data for the snapshot card
  const maxUsersToRank = 100;
  const leaderboardUsers = await prisma.user.findMany({
    where: {
      trades: {
        some: {},
      },
    },
    select: {
      id: true,
      username: true,
      xHandle: true,
      image: true,
    },
    take: maxUsersToRank,
  });

  // Fetch all trades for leaderboard users
  const leaderboardUserIds = leaderboardUsers.map((u) => u.id);
  const leaderboardTrades = await prisma.trade.findMany({
    where: {
      userId: { in: leaderboardUserIds },
    },
    orderBy: { timestamp: "asc" },
  });

  // Group trades by userId
  const leaderboardTradesByUserId: Record<string, typeof leaderboardTrades> = {};
  for (const trade of leaderboardTrades) {
    if (!leaderboardTradesByUserId[trade.userId]) {
      leaderboardTradesByUserId[trade.userId] = [];
    }
    leaderboardTradesByUserId[trade.userId].push(trade);
  }

  // Build leaderboard entries
  const leaderboardEntries = buildUserLeaderboardEntries(
    leaderboardUsers,
    leaderboardTradesByUserId,
    "realizedPnl",
    "all",
    undefined
  );

  // Find user's rank in leaderboard
  const userLeaderboardIndex = leaderboardEntries.findIndex((e) => e.userId === userId);
  const userLeaderboardRank = userLeaderboardIndex >= 0 ? userLeaderboardIndex + 1 : null;

  // Get recent trades for the table (5 most recent)
  const recentTrades = await prisma.trade.findMany({
    where: { userId },
    orderBy: { timestamp: "desc" },
    take: 5,
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
    },
  });

  // Get crew members for avatar preview
  const crewMembers = crewMember?.crew
    ? await prisma.crewMember.findMany({
        where: { crewId: crewMember.crew.id },
        include: {
          user: {
            select: {
              id: true,
              image: true,
              username: true,
              name: true,
              email: true,
            },
          },
        },
        take: 6,
      })
    : [];

  // Compute crew PnL sparkline data (all-time cumulative PnL over time)
  let crewSparklineData: number[] | undefined = undefined;
  
  if (crewMember?.crew) {
    // Fetch all crew member IDs
    const allCrewMembers = await prisma.crewMember.findMany({
      where: { crewId: crewMember.crew.id },
      select: { userId: true },
    });
    
    const crewMemberIds = allCrewMembers.map((m) => m.userId);
    
    // Fetch all trades for crew members, ordered by timestamp
    const crewTrades = await prisma.trade.findMany({
      where: {
        userId: { in: crewMemberIds },
      },
      orderBy: { timestamp: "asc" },
      select: {
        timestamp: true,
        usdValue: true,
        direction: true,
      },
    });
    
    if (crewTrades.length > 0) {
      // Group trades by day and compute cumulative PnL
      const dailyPnL: Map<string, number> = new Map();
      
      for (const trade of crewTrades) {
        const dateKey = trade.timestamp.toISOString().split('T')[0];
        const currentDayPnL = dailyPnL.get(dateKey) || 0;
        // Estimate PnL contribution: positive for sells, negative for buys
        const pnlContribution = trade.direction === 'SELL' 
          ? (trade.usdValue || 0) * 0.1 // Simplified: assume 10% profit on sells
          : -(trade.usdValue || 0) * 0.05; // Simplified: assume 5% unrealized on buys
        dailyPnL.set(dateKey, currentDayPnL + pnlContribution);
      }
      
      // Convert to cumulative sparkline data (last 30 data points)
      const sortedDays = Array.from(dailyPnL.keys()).sort();
      let cumulativePnL = 0;
      const cumulativeData: number[] = [];
      
      for (const day of sortedDays) {
        cumulativePnL += dailyPnL.get(day) || 0;
        cumulativeData.push(cumulativePnL);
      }
      
      // Take last 30 points for the sparkline
      crewSparklineData = cumulativeData.slice(-30);
      
      // Ensure we have at least 2 points for a proper line
      if (crewSparklineData.length === 1) {
        crewSparklineData = [0, crewSparklineData[0]];
      }
    }
  }

  // Fetch user's latest PnL card
  const latestPnLCard = await prisma.sharedCard.findFirst({
    where: {
      userId: userId,
      cardType: "user",
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  // Parse the card data if it exists
  let pnlCardData: {
    cardId: string;
    settings: {
      theme: string;
      backgroundColor: string;
      accentColor: string;
      showPnl?: boolean;
      showVolume?: boolean;
      showWinRate?: boolean;
      showTotalTrades?: boolean;
      frame?: string;
      badges?: string[];
      font?: string;
    };
    stats: {
      pnl?: {
        totalPnl?: number;
        realizedPnl?: number;
        unrealizedPnl?: number;
        winRate?: number;
        volume?: number;
        totalTrades?: number;
      };
    };
    range: string;
  } | null = null;

  if (latestPnLCard) {
    try {
      const snapshot = JSON.parse(latestPnLCard.snapshotData);
      pnlCardData = {
        cardId: latestPnLCard.shareToken,
        settings: snapshot.settings || {
          theme: "dark",
          backgroundColor: "#111111",
          accentColor: "#A855F7",
          showPnl: true,
          showVolume: true,
          showWinRate: true,
          showTotalTrades: true,
          frame: "none",
          badges: [],
          font: "Inter",
        },
        stats: snapshot.stats || { pnl: {} },
        range: latestPnLCard.timeframe || "all",
      };
    } catch {
      // If parsing fails, leave as null
    }
  }

  // Get crew leader name
  const crewLeaderName = crewMember?.crew?.createdBy?.username || crewMember?.crew?.createdBy?.name || undefined;

  return (
    <>
      <Navbar />
      <div className="min-h-screen bg-bg-main">
        <div className="container mx-auto px-4 py-8 max-w-7xl">
          {/* Page Header */}
          <div className="mb-8">
            <h1 className="text-white text-2xl font-semibold">Dashboard</h1>
            <p className="text-white/60 text-sm mt-1">
              Your trading overview, stats, and performance at a glance.
            </p>
          </div>

          {/* Main Grid Layout */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Row 1: PnL Card + Crew Card */}
            <DashboardPnLCard pnlCardData={pnlCardData} />
            <CrewDashboardCard
              crew={crewMember?.crew || null}
              crewLeaderName={crewLeaderName}
              crewMembers={crewMembers}
              sparklineData={crewSparklineData}
            />

            {/* Row 2: Stats Card (merged with Tournaments) + Leaderboard Snapshot Card */}
            <StatsDashboardCard
              user={user}
              seasonPnL={seasonPnL}
              tournaments={tournamentsWithParticipation}
              userBestRank={crewRank}
              userPerformance={seasonPnL ? Math.round(seasonPnL.winRate * 100) : null}
            />
            <LeaderboardSnapshotCard
              currentUserId={userId}
              entries={leaderboardEntries}
              userRank={userLeaderboardRank}
            />

            {/* Row 3: Recent Trades Table (Full Width) */}
            <div className="lg:col-span-2">
              <RecentTradesTable trades={recentTrades as any} />
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
