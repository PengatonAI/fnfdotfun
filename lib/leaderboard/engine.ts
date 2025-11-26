import { Trade, User } from "@prisma/client";
import { PnLResult } from "@/lib/pnl/types";
import { computePnL } from "@/lib/pnl/engine";
import { LeaderboardEntry, LeaderboardMetric, Timeframe } from "./types";

/**
 * Filter options for trades.
 */
interface FilterOptions {
  startDate?: Date;
  endDate?: Date;
  chain?: string;
}

/**
 * Get time window dates based on timeframe.
 * 
 * @param timeframe - The timeframe string ('all', '30d', '7d')
 * @returns Object with optional startDate and endDate
 */
export function getTimeWindow(
  timeframe: Timeframe
): { startDate?: Date; endDate?: Date } {
  const now = new Date();

  switch (timeframe) {
    case "all":
      return {};

    case "30d":
      const thirtyDaysAgo = new Date(now);
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      return { startDate: thirtyDaysAgo, endDate: now };

    case "7d":
      const sevenDaysAgo = new Date(now);
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      return { startDate: sevenDaysAgo, endDate: now };

    default:
      return {};
  }
}

/**
 * Filter trades by start date, end date, and optional chain.
 * 
 * @param trades - Array of Trade records to filter
 * @param opts - Filter options (startDate, endDate, chain)
 * @returns Filtered array of Trade records
 */
export function filterTrades(
  trades: Trade[],
  opts: FilterOptions
): Trade[] {
  return trades.filter((trade) => {
    // Filter by start date
    if (opts.startDate) {
      const tradeDate =
        trade.timestamp instanceof Date
          ? trade.timestamp
          : new Date(trade.timestamp);
      if (tradeDate < opts.startDate) {
        return false;
      }
    }

    // Filter by end date
    if (opts.endDate) {
      const tradeDate =
        trade.timestamp instanceof Date
          ? trade.timestamp
          : new Date(trade.timestamp);
      if (tradeDate > opts.endDate) {
        return false;
      }
    }

    // Filter by chain
    if (opts.chain) {
      if (trade.chain !== opts.chain) {
        return false;
      }
    }

    return true;
  });
}

/**
 * Extract the metric value from a PnLResult based on the metric type.
 * 
 * @param pnl - The PnLResult from computePnL()
 * @param metric - The metric type to extract
 * @returns The numeric value for the metric
 */
export function extractMetric(
  pnl: PnLResult,
  metric: LeaderboardMetric
): number {
  switch (metric) {
    case "realizedPnl":
      return pnl.realizedPnL;

    case "totalPnl":
      return pnl.totalPnL;

    case "volume":
      return pnl.metrics.volume;

    case "winRate":
      return pnl.metrics.winRate;

    default:
      return 0;
  }
}

/**
 * Build leaderboard entries for users based on their trades.
 * 
 * This is the core function that:
 * 1. Filters trades per user by timeframe and chain
 * 2. Runs computePnL() for each user
 * 3. Extracts the metric value
 * 4. Assembles a LeaderboardEntry[]
 * 5. Sorts descending by metric value
 * 
 * @param users - Array of User records with id, username, xHandle, image
 * @param tradesByUserId - Map of userId -> Trade[] for all trades
 * @param metric - The metric to rank by
 * @param timeframe - Timeframe to filter trades ('all', '30d', '7d')
 * @param chain - Optional chain filter (e.g., 'evm', 'solana')
 * @returns Sorted array of LeaderboardEntry, descending by metric value
 */
export function buildUserLeaderboardEntries(
  users: Pick<User, "id" | "username" | "xHandle" | "image">[],
  tradesByUserId: Record<string, Trade[]>,
  metric: LeaderboardMetric,
  timeframe: Timeframe,
  chain?: string
): LeaderboardEntry[] {
  const { startDate, endDate } = getTimeWindow(timeframe);
  const entries: LeaderboardEntry[] = [];

  for (const user of users) {
    // Get trades for this user
    const userTrades = tradesByUserId[user.id] || [];

    // Filter trades by timeframe and chain
    const filteredTrades = filterTrades(userTrades, {
      startDate,
      endDate,
      chain,
    });

    // Skip users with 0 trades in timeframe
    if (filteredTrades.length === 0) {
      continue;
    }

    // Run computePnL() for this user's filtered trades
    // Note: We don't fetch current prices here to keep it pure and fast
    // For leaderboards, we can use realizedPnL which doesn't need current prices
    // Or we can fetch prices in the API layer and pass them in
    const pnl = computePnL(filteredTrades, {});

    // Extract the metric value
    const metricValue = extractMetric(pnl, metric);

    // Assemble LeaderboardEntry
    const entry: LeaderboardEntry = {
      userId: user.id,
      username: user.username,
      xHandle: user.xHandle,
      image: user.image,
      metric,
      metricValue,
      totalTrades: pnl.metrics.totalTrades,
      volume: pnl.metrics.volume,
      winRate: pnl.metrics.winRate,
      realizedPnl: pnl.realizedPnL,
      totalPnl: pnl.totalPnL,
    };

    entries.push(entry);
  }

  // Sort descending by metric value
  entries.sort((a, b) => b.metricValue - a.metricValue);

  return entries;
}

