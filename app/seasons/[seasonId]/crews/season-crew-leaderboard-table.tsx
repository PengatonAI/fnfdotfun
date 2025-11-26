"use client";

import Image from "next/image";
import Link from "next/link";
import { LeaderboardMetric } from "@/lib/leaderboard/types";
import { Sparkline } from "@/app/dashboard/components/sparkline";
import { Users } from "lucide-react";

interface SeasonCrewLeaderboardEntry {
  crewId: string;
  crewName: string;
  crewAvatar: string | null;
  realizedPnl: number;
  totalPnl: number;
  volume: number;
  winRate: number;
  totalTrades: number;
  members: number;
  metricValue: number;
}

interface SeasonCrewLeaderboardTableProps {
  entries: SeasonCrewLeaderboardEntry[];
  metric: LeaderboardMetric;
}

export default function SeasonCrewLeaderboardTable({
  entries,
  metric,
}: SeasonCrewLeaderboardTableProps) {
  // Format currency
  const formatCurrency = (value: number): string => {
    const absValue = Math.abs(value);
    const prefix = value >= 0 ? "+$" : "-$";
    if (absValue >= 1000000) {
      return `${prefix}${(absValue / 1000000).toFixed(2)}M`;
    }
    if (absValue >= 1000) {
      return `${prefix}${(absValue / 1000).toFixed(2)}K`;
    }
    return `${prefix}${absValue.toFixed(2)}`;
  };

  // Format percentage
  const formatPercent = (value: number): string => {
    return `${(value * 100).toFixed(1)}%`;
  };

  // Format large numbers
  const formatNumber = (value: number): string => {
    if (value >= 1000000) {
      return `${(value / 1000000).toFixed(1)}M`;
    }
    if (value >= 1000) {
      return `${(value / 1000).toFixed(1)}K`;
    }
    return value.toLocaleString();
  };

  // Get metric label
  const getMetricLabel = (m: LeaderboardMetric): string => {
    switch (m) {
      case "realizedPnl":
        return "Realized PnL";
      case "totalPnl":
        return "Total PnL";
      case "volume":
        return "Volume";
      case "winRate":
        return "Win Rate";
      default:
        return "";
    }
  };

  // Format metric value based on type
  const formatMetricValue = (
    entry: SeasonCrewLeaderboardEntry,
    m: LeaderboardMetric
  ): string => {
    const value = entry.metricValue;
    if (m === "winRate") {
      return formatPercent(value);
    } else if (m === "volume") {
      return `$${formatNumber(value)}`;
    } else {
      return formatCurrency(value);
    }
  };

  // Get rank medal
  const getRankDisplay = (rank: number) => {
    if (rank === 1) {
      return (
        <div className="flex items-center justify-center w-10 h-10 rounded-full bg-gradient-to-br from-yellow-400/20 to-yellow-600/20 border border-yellow-500/30">
          <span className="text-xl">🥇</span>
        </div>
      );
    }
    if (rank === 2) {
      return (
        <div className="flex items-center justify-center w-10 h-10 rounded-full bg-gradient-to-br from-gray-300/20 to-gray-500/20 border border-gray-400/30">
          <span className="text-xl">🥈</span>
        </div>
      );
    }
    if (rank === 3) {
      return (
        <div className="flex items-center justify-center w-10 h-10 rounded-full bg-gradient-to-br from-amber-600/20 to-amber-800/20 border border-amber-600/30">
          <span className="text-xl">🥉</span>
        </div>
      );
    }
    return (
      <div className="flex items-center justify-center w-10 h-10 rounded-full bg-[#0a0a0a] border border-[#2a2a2a]">
        <span className="text-sm font-bold text-white/50">#{rank}</span>
      </div>
    );
  };

  // Empty state
  if (entries.length === 0) {
    return (
      <div className="relative rounded-xl bg-gradient-to-br from-[#0d0d0d] via-[#111111] to-[#0a0a0a] border border-[#1a1a1a] p-12 shadow-[0_4px_20px_rgba(0,0,0,0.3)]">
        {/* Decorative elements */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none rounded-xl">
          <div className="absolute -top-12 -right-12 w-48 h-48 bg-gradient-to-br from-accent/5 to-transparent rounded-full blur-3xl" />
          <div className="absolute -bottom-12 -left-12 w-32 h-32 bg-gradient-to-tr from-emerald-500/5 to-transparent rounded-full blur-3xl" />
        </div>
        
        <div className="relative flex flex-col items-center gap-6 text-center">
          <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-accent/10 to-accent/5 border border-accent/20 flex items-center justify-center">
            <Users className="w-10 h-10 text-accent/60" />
          </div>
          <div>
            <h3 className="text-xl font-semibold text-white mb-2">No Crews Yet</h3>
            <p className="text-white/40 max-w-md">
              No crews have participated in this season yet. Register your crew to appear on the leaderboard!
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative rounded-xl bg-gradient-to-br from-[#0d0d0d] via-[#111111] to-[#0a0a0a] border border-[#1a1a1a] shadow-[0_4px_20px_rgba(0,0,0,0.3)] overflow-hidden">
      {/* Header */}
      <div className="px-6 py-4 border-b border-[#1a1a1a] bg-[#0a0a0a]/50">
        <div className="grid grid-cols-12 gap-4 items-center text-xs font-medium text-white/40 uppercase tracking-wider">
          <div className="col-span-1">Rank</div>
          <div className="col-span-3">Crew</div>
          <div className="col-span-2 text-right">{getMetricLabel(metric)}</div>
          <div className="col-span-1 text-right">Trades</div>
          <div className="col-span-2 text-right">Volume</div>
          <div className="col-span-1 text-right">Win Rate</div>
          <div className="col-span-2 text-right">Trend</div>
        </div>
      </div>

      {/* Rows */}
      <div className="divide-y divide-[#1a1a1a]">
        {entries.map((entry, index) => {
          const rank = index + 1;
          const isTop3 = rank <= 3;

          return (
            <div
              key={entry.crewId}
              className={`relative px-6 py-4 transition-all duration-200 hover:bg-white/[0.02] ${
                isTop3
                  ? "bg-gradient-to-r from-accent/5 via-transparent to-transparent"
                  : ""
              }`}
            >
              {/* Top 3 accent bar */}
              {isTop3 && (
                <div className="absolute left-0 top-0 bottom-0 w-[2px] bg-gradient-to-b from-accent via-purple-500 to-pink-500" />
              )}

              <div className="relative grid grid-cols-12 gap-4 items-center">
                {/* Rank */}
                <div className="col-span-1">
                  {getRankDisplay(rank)}
                </div>

                {/* Crew */}
                <div className="col-span-3">
                  <Link
                    href={`/crews/${entry.crewId}`}
                    className="flex items-center gap-3 hover:opacity-80 transition-opacity"
                  >
                    {/* Avatar */}
                    <div className="relative flex-shrink-0">
                      <div className={`relative h-10 w-10 rounded-full overflow-hidden bg-[#1a1a1a] flex items-center justify-center border ${
                        isTop3 ? "border-accent/50" : "border-[#2a2a2a]"
                      }`}>
                        {entry.crewAvatar ? (
                          <Image
                            src={entry.crewAvatar}
                            alt={entry.crewName}
                            width={40}
                            height={40}
                            className="object-cover"
                          />
                        ) : (
                          <span className="text-sm font-medium text-white/60">
                            {entry.crewName[0].toUpperCase()}
                          </span>
                        )}
                      </div>
                      {/* Neon ring for top 3 */}
                      {isTop3 && (
                        <div className="absolute -inset-0.5 bg-gradient-to-r from-accent/40 via-purple-500/40 to-pink-500/40 rounded-full blur-sm opacity-60 -z-10" />
                      )}
                    </div>

                    {/* Crew Name */}
                    <div className="min-w-0 flex-1">
                      <span className="font-medium text-white/90 truncate block">
                        {entry.crewName}
                      </span>
                      <span className="text-xs text-white/40">
                        {entry.members} member{entry.members !== 1 ? "s" : ""}
                      </span>
                    </div>
                  </Link>
                </div>

                {/* Metric Value */}
                <div className="col-span-2 text-right">
                  <span
                    className={`text-lg font-bold ${
                      metric === "winRate"
                        ? "text-white"
                        : entry.metricValue >= 0
                        ? "text-[#00d57a]"
                        : "text-[#ff4a4a]"
                    }`}
                  >
                    {formatMetricValue(entry, metric)}
                  </span>
                </div>

                {/* Trades */}
                <div className="col-span-1 text-right">
                  <span className="text-sm text-white/60">{formatNumber(entry.totalTrades)}</span>
                </div>

                {/* Volume */}
                <div className="col-span-2 text-right">
                  <span className="text-sm text-white/60">${formatNumber(entry.volume)}</span>
                </div>

                {/* Win Rate */}
                <div className="col-span-1 text-right">
                  <span className={`text-sm font-medium ${
                    entry.winRate >= 0.5 ? "text-[#00d57a]" : "text-[#ff4a4a]"
                  }`}>
                    {formatPercent(entry.winRate)}
                  </span>
                </div>

                {/* Sparkline */}
                <div className="col-span-2 flex justify-end">
                  <Sparkline 
                    width={80} 
                    height={30} 
                    color={entry.metricValue >= 0 ? "#00d57a" : "#ff4a4a"}
                  />
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
