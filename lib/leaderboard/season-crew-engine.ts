import { Season, SeasonUserSnapshot, Crew, CrewMember, User, Trade } from "@prisma/client";
import { PnLResult } from "@/lib/pnl/types";
import { computePnL } from "@/lib/pnl/engine";
import { LeaderboardMetric } from "./types";

/**
 * Compute season-specific metrics by subtracting snapshot values from current values.
 * Reuses logic from season-engine.ts
 */
function computeSeasonMetrics(
  currentPnL: PnLResult,
  snapshot: SeasonUserSnapshot
): {
  seasonRealizedPnl: number;
  seasonTotalPnl: number;
  seasonVolume: number;
  seasonTotalTrades: number;
} {
  return {
    seasonRealizedPnl: currentPnL.realizedPnL - snapshot.realizedPnl,
    seasonTotalPnl: currentPnL.totalPnL - snapshot.totalPnl,
    seasonVolume: currentPnL.metrics.volume - snapshot.volume,
    seasonTotalTrades: currentPnL.metrics.totalTrades - snapshot.totalTrades,
  };
}

/**
 * Crew season leaderboard entry.
 */
export interface SeasonCrewLeaderboardEntry {
  crewId: string;
  crewName: string;
  crewAvatar: string | null;
  realizedPnl: number;
  totalPnl: number;
  volume: number;
  winRate: number;
  totalTrades: number;
  members: number;
  metricValue: number; // The value for the selected metric
}

/**
 * Compute season crew leaderboard by aggregating user season PnL by crew.
 * 
 * @param season - The season object
 * @param snapshots - Array of user snapshots for this season
 * @param tradesByUserId - Map of userId -> Trade[] (all trades for users in season)
 * @param crews - Array of crews with members
 * @param metric - The metric to rank by
 * @returns Sorted array of crew leaderboard entries
 */
export async function computeSeasonCrewLeaderboard({
  season,
  snapshots,
  tradesByUserId,
  crews,
  metric,
}: {
  season: Season;
  snapshots: SeasonUserSnapshot[];
  tradesByUserId: Record<string, Trade[]>;
  crews: Array<{
    id: string;
    name: string;
    avatarUrl: string | null;
    members: Array<{ userId: string }>;
  }>;
  metric: LeaderboardMetric;
}): Promise<SeasonCrewLeaderboardEntry[]> {
  // Create snapshot map
  const snapshotsByUserId: Record<string, SeasonUserSnapshot> = {};
  for (const snapshot of snapshots) {
    snapshotsByUserId[snapshot.userId] = snapshot;
  }

  // Compute per-user season PnL
  const userSeasonMetrics: Record<
    string,
    {
      realizedPnl: number;
      totalPnl: number;
      volume: number;
      totalTrades: number;
      winRate: number;
    }
  > = {};

  for (const userId of Object.keys(tradesByUserId)) {
    const userTrades = tradesByUserId[userId];
    if (!userTrades || userTrades.length === 0) {
      continue;
    }

    // Compute current PnL (all trades for accurate FIFO)
    const currentPnL = computePnL(userTrades, {});

    // Get snapshot or use zero baseline
    const snapshot = snapshotsByUserId[userId] || {
      id: "",
      seasonId: season.id,
      userId,
      realizedPnl: 0,
      totalPnl: 0,
      volume: 0,
      totalTrades: 0,
      createdAt: new Date(),
    };

    // Compute season metrics
    const seasonMetrics = computeSeasonMetrics(currentPnL, snapshot);

    userSeasonMetrics[userId] = {
      realizedPnl: seasonMetrics.seasonRealizedPnl,
      totalPnl: seasonMetrics.seasonTotalPnl,
      volume: seasonMetrics.seasonVolume,
      totalTrades: seasonMetrics.seasonTotalTrades,
      winRate: currentPnL.metrics.winRate, // Use current win rate
    };
  }

  // Group users by crew and aggregate metrics
  const crewMetrics: Record<
    string,
    {
      crewId: string;
      crewName: string;
      crewAvatar: string | null;
      realizedPnl: number;
      totalPnl: number;
      volume: number;
      totalTrades: number;
      winRates: number[];
      memberCount: number;
    }
  > = {};

  for (const crew of crews) {
    if (crew.members.length === 0) {
      continue;
    }

    let realizedPnl = 0;
    let totalPnl = 0;
    let volume = 0;
    let totalTrades = 0;
    const winRates: number[] = [];
    let activeMemberCount = 0;

    for (const member of crew.members) {
      const userMetrics = userSeasonMetrics[member.userId];
      if (!userMetrics) {
        continue; // User has no trades in season
      }

      realizedPnl += userMetrics.realizedPnl;
      totalPnl += userMetrics.totalPnl;
      volume += userMetrics.volume;
      totalTrades += userMetrics.totalTrades;
      winRates.push(userMetrics.winRate);
      activeMemberCount++;
    }

    // Skip crews with no active members
    if (activeMemberCount === 0) {
      continue;
    }

    crewMetrics[crew.id] = {
      crewId: crew.id,
      crewName: crew.name,
      crewAvatar: crew.avatarUrl,
      realizedPnl,
      totalPnl,
      volume,
      totalTrades,
      winRates,
      memberCount: activeMemberCount,
    };
  }

  // Convert to leaderboard entries and compute metric value
  const entries: SeasonCrewLeaderboardEntry[] = [];

  for (const crewId of Object.keys(crewMetrics)) {
    const metrics = crewMetrics[crewId];

    // Compute average win rate
    const winRate =
      metrics.winRates.length > 0
        ? metrics.winRates.reduce((sum, rate) => sum + rate, 0) /
          metrics.winRates.length
        : 0;

    // Extract metric value
    let metricValue = 0;
    switch (metric) {
      case "realizedPnl":
        metricValue = metrics.realizedPnl;
        break;
      case "totalPnl":
        metricValue = metrics.totalPnl;
        break;
      case "volume":
        metricValue = metrics.volume;
        break;
      case "winRate":
        metricValue = winRate;
        break;
    }

    entries.push({
      crewId: metrics.crewId,
      crewName: metrics.crewName,
      crewAvatar: metrics.crewAvatar,
      realizedPnl: metrics.realizedPnl,
      totalPnl: metrics.totalPnl,
      volume: metrics.volume,
      winRate,
      totalTrades: metrics.totalTrades,
      members: metrics.memberCount,
      metricValue,
    });
  }

  // Sort by metric value descending
  entries.sort((a, b) => b.metricValue - a.metricValue);

  return entries;
}

