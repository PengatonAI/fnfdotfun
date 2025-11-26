import { Trade } from "@prisma/client";
import { PnLResult } from "@/lib/pnl/types";
import { computePnL } from "@/lib/pnl/engine";
import { Timeframe } from "./types";
import { getTimeWindow, filterTrades } from "./engine";

/**
 * Crew leaderboard metric types that can be used for ranking crews.
 * Extends user metrics with avgWinRate.
 */
export type CrewLeaderboardMetric =
  | "realizedPnl"
  | "totalPnl"
  | "volume"
  | "avgWinRate";

/**
 * Crew leaderboard entry representing a single crew's ranking.
 */
export interface CrewLeaderboardEntry {
  crewId: string;
  crewName: string;
  metric: CrewLeaderboardMetric;
  metricValue: number;
  totalTrades: number;
  totalVolume: number;
  avgWinRate: number;
  memberCount: number;
}

/**
 * Aggregated PnL metrics for a crew across all members.
 */
interface CrewAggregate {
  realizedPnl: number;
  totalPnl: number;
  volume: number;
  totalTrades: number;
  winRates: number[]; // Array of win rates per member for averaging
  memberCount: number;
}

/**
 * Filter trades for a given context (timeframe and chain).
 * Reuses the filterTrades function from the user leaderboard engine.
 * 
 * @param trades - Array of Trade records to filter
 * @param timeframe - Timeframe to filter by
 * @param chain - Optional chain filter
 * @returns Filtered array of Trade records
 */
function filterTradesForContext(
  trades: Trade[],
  timeframe: Timeframe,
  chain?: string
): Trade[] {
  const { startDate, endDate } = getTimeWindow(timeframe);
  return filterTrades(trades, { startDate, endDate, chain });
}

/**
 * Aggregate PnL results from multiple members into crew totals.
 * 
 * @param memberResults - Array of PnLResult objects, one per member
 * @returns CrewAggregate with summed metrics and averaged win rate
 */
function aggregateMemberPnL(memberResults: PnLResult[]): CrewAggregate {
  let realizedPnl = 0;
  let totalPnl = 0;
  let volume = 0;
  let totalTrades = 0;
  const winRates: number[] = [];

  for (const result of memberResults) {
    realizedPnl += result.realizedPnL;
    totalPnl += result.totalPnL;
    volume += result.metrics.volume;
    totalTrades += result.metrics.totalTrades;
    winRates.push(result.metrics.winRate);
  }

  return {
    realizedPnl,
    totalPnl,
    volume,
    totalTrades,
    winRates,
    memberCount: memberResults.length,
  };
}

/**
 * Extract the metric value from a crew aggregate based on the metric type.
 * 
 * @param aggregate - The CrewAggregate with summed metrics
 * @param metric - The metric type to extract
 * @returns The numeric value for the metric
 */
function extractCrewMetric(
  aggregate: CrewAggregate,
  metric: CrewLeaderboardMetric
): number {
  switch (metric) {
    case "realizedPnl":
      return aggregate.realizedPnl;

    case "totalPnl":
      return aggregate.totalPnl;

    case "volume":
      return aggregate.volume;

    case "avgWinRate":
      // Average win rate across all members
      if (aggregate.winRates.length === 0) {
        return 0;
      }
      const sum = aggregate.winRates.reduce((acc, rate) => acc + rate, 0);
      return sum / aggregate.winRates.length;

    default:
      return 0;
  }
}

/**
 * Crew structure expected by the engine.
 */
interface CrewInput {
  id: string;
  name: string;
  members: { userId: string }[];
}

/**
 * Build leaderboard entries for crews based on their members' trades.
 * 
 * This is the core function that:
 * 1. Collects all trades for all crew members
 * 2. Filters trades by timeframe and chain
 * 3. Runs computePnL() for each member
 * 4. Aggregates PnL per member → per crew
 * 5. Extracts the metric value
 * 6. Assembles a CrewLeaderboardEntry[]
 * 7. Sorts descending by metric value
 * 
 * @param crews - Array of CrewInput with id, name, and members
 * @param tradesByUserId - Map or Record of userId -> Trade[] for all trades
 * @param metric - The metric to rank by
 * @param timeframe - Timeframe to filter trades ('all', '30d', '7d')
 * @param chain - Optional chain filter (e.g., 'evm', 'solana')
 * @returns Sorted array of CrewLeaderboardEntry, descending by metric value
 */
export function buildCrewLeaderboardEntries(
  crews: CrewInput[],
  tradesByUserId: Map<string, Trade[]> | Record<string, Trade[]>,
  metric: CrewLeaderboardMetric,
  timeframe: Timeframe,
  chain?: string
): CrewLeaderboardEntry[] {
  const entries: CrewLeaderboardEntry[] = [];

  // Convert Record to Map if needed for consistent access
  const tradesMap = tradesByUserId instanceof Map
    ? tradesByUserId
    : new Map(Object.entries(tradesByUserId));

  for (const crew of crews) {
    // Skip crews with no members
    if (crew.members.length === 0) {
      continue;
    }

    // Collect all trades for all members
    const allMemberTrades: Trade[] = [];
    for (const member of crew.members) {
      const memberTrades = tradesMap.get(member.userId) || [];
      allMemberTrades.push(...memberTrades);
    }

    // Filter trades by timeframe and chain
    const filteredTrades = filterTradesForContext(
      allMemberTrades,
      timeframe,
      chain
    );

    // Skip crews with 0 trades in timeframe
    if (filteredTrades.length === 0) {
      continue;
    }

    // For each member, compute PnL on their filtered trades
    const memberPnLResults: PnLResult[] = [];
    for (const member of crew.members) {
      const memberTrades = tradesMap.get(member.userId) || [];
      const memberFilteredTrades = filterTradesForContext(
        memberTrades,
        timeframe,
        chain
      );

      // Skip members with no trades in timeframe
      if (memberFilteredTrades.length === 0) {
        continue;
      }

      // Run computePnL() for this member's filtered trades
      const pnl = computePnL(memberFilteredTrades, {});
      memberPnLResults.push(pnl);
    }

    // Skip crews with no members that have trades in timeframe
    if (memberPnLResults.length === 0) {
      continue;
    }

    // Aggregate PnL per member → per crew
    const aggregate = aggregateMemberPnL(memberPnLResults);

    // Extract the metric value
    const metricValue = extractCrewMetric(aggregate, metric);

    // Calculate average win rate
    const avgWinRate =
      aggregate.winRates.length > 0
        ? aggregate.winRates.reduce((sum, rate) => sum + rate, 0) /
          aggregate.winRates.length
        : 0;

    // Assemble CrewLeaderboardEntry
    const entry: CrewLeaderboardEntry = {
      crewId: crew.id,
      crewName: crew.name,
      metric,
      metricValue,
      totalTrades: aggregate.totalTrades,
      totalVolume: aggregate.volume,
      avgWinRate,
      memberCount: aggregate.memberCount,
    };

    entries.push(entry);
  }

  // Sort descending by metric value
  entries.sort((a, b) => b.metricValue - a.metricValue);

  return entries;
}

