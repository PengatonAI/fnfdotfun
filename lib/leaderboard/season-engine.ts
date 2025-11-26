import { Season, SeasonUserSnapshot, User } from "@prisma/client";
import { PnLResult } from "@/lib/pnl/types";
import { LeaderboardEntry, LeaderboardMetric } from "./types";

/**
 * Compute season-specific metrics by subtracting snapshot values from current values.
 * 
 * This function takes the current PnL results and baseline snapshot values,
 * then computes the delta (season performance) for each metric.
 * 
 * @param currentPnL - Current PnL results computed from all trades
 * @param snapshot - Baseline snapshot values from season start
 * @returns Object with season-specific metrics
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
 * Extract the season metric value based on the metric type.
 * 
 * @param seasonMetrics - Season metrics computed from snapshot subtraction
 * @param metric - The metric type to extract
 * @returns The numeric value for the metric
 */
function extractSeasonMetric(
  seasonMetrics: {
    seasonRealizedPnl: number;
    seasonTotalPnl: number;
    seasonVolume: number;
    seasonTotalTrades: number;
  },
  metric: LeaderboardMetric
): number {
  switch (metric) {
    case "realizedPnl":
      return seasonMetrics.seasonRealizedPnl;

    case "totalPnl":
      return seasonMetrics.seasonTotalPnl;

    case "volume":
      return seasonMetrics.seasonVolume;

    case "winRate":
      // Win rate is computed from current PnL metrics (not a delta)
      // We'll need to pass this separately or compute it from season trades
      // For now, return 0 as winRate needs to be computed from season trades only
      return 0;

    default:
      return 0;
  }
}

/**
 * Build season leaderboard entries by combining current PnL with snapshot baselines.
 * 
 * This engine:
 * 1. Takes current PnL results (computed from all trades)
 * 2. Subtracts snapshot baseline values to get season-only metrics
 * 3. Builds LeaderboardEntry objects matching the standard leaderboard shape
 * 4. Sorts by metric value descending
 * 
 * @param users - Array of User records with id, username, xHandle, image
 * @param currentPnLByUserId - Map of userId -> PnLResult (current PnL from all trades)
 * @param snapshotsByUserId - Map of userId -> SeasonUserSnapshot (baseline values)
 * @param metric - The metric to rank by
 * @returns Sorted array of LeaderboardEntry, descending by metric value
 */
export function buildSeasonLeaderboardEntries(
  users: Pick<User, "id" | "username" | "xHandle" | "image">[],
  currentPnLByUserId: Record<string, PnLResult>,
  snapshotsByUserId: Record<string, SeasonUserSnapshot>,
  metric: LeaderboardMetric
): LeaderboardEntry[] {
  const entries: LeaderboardEntry[] = [];

  for (const user of users) {
    const currentPnL = currentPnLByUserId[user.id];
    const snapshot = snapshotsByUserId[user.id];

    // Skip if no current PnL data
    if (!currentPnL) {
      continue;
    }

    // If no snapshot exists, use 0 as baseline (user started trading during season)
    const baselineSnapshot: SeasonUserSnapshot = snapshot || {
      id: "",
      seasonId: "",
      userId: user.id,
      realizedPnl: 0,
      totalPnl: 0,
      volume: 0,
      totalTrades: 0,
      createdAt: new Date(),
    };

    // Compute season metrics by subtracting snapshot from current
    const seasonMetrics = computeSeasonMetrics(currentPnL, baselineSnapshot);

    // Extract the metric value for ranking
    let metricValue = extractSeasonMetric(seasonMetrics, metric);

    // Special handling for winRate: compute from season trades only
    // Since we don't have season-only trades here, we use current winRate
    // This is a limitation - ideally we'd filter trades to season timeframe
    // For now, we'll use the current winRate as an approximation
    if (metric === "winRate") {
      metricValue = currentPnL.metrics.winRate;
    }

    // Build leaderboard entry
    const entry: LeaderboardEntry = {
      userId: user.id,
      username: user.username,
      xHandle: user.xHandle,
      image: user.image,
      metric,
      metricValue,
      // Use season-specific values
      totalTrades: seasonMetrics.seasonTotalTrades,
      volume: seasonMetrics.seasonVolume,
      winRate: metric === "winRate" ? metricValue : currentPnL.metrics.winRate,
      realizedPnl: seasonMetrics.seasonRealizedPnl,
      totalPnl: seasonMetrics.seasonTotalPnl,
    };

    entries.push(entry);
  }

  // Sort descending by metric value
  entries.sort((a, b) => b.metricValue - a.metricValue);

  return entries;
}

