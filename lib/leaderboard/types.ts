/**
 * Leaderboard metric types that can be used for ranking users.
 */
export type LeaderboardMetric =
  | "realizedPnl"
  | "totalPnl"
  | "volume"
  | "winRate";

/**
 * Timeframe for filtering trades.
 * - 'all': No time filtering (all trades)
 * - '30d': Last 30 days
 * - '7d': Last 7 days
 */
export type Timeframe = "all" | "30d" | "7d";

/**
 * Leaderboard entry representing a single user's ranking.
 */
export interface LeaderboardEntry {
  userId: string;
  username: string | null;
  xHandle: string | null;
  image: string | null;
  metric: LeaderboardMetric;
  metricValue: number;
  totalTrades: number;
  volume: number;
  winRate: number;
  realizedPnl: number;
  totalPnl: number;
}

