"use client";

import Link from "next/link";
import { CrewLeaderboardEntry, CrewLeaderboardMetric } from "@/lib/leaderboard/crew-engine";
import { Sparkline } from "@/app/dashboard/components/sparkline";
import { Trophy, Users } from "lucide-react";

interface CrewLeaderboardTableProps {
  entries: CrewLeaderboardEntry[];
  metric: CrewLeaderboardMetric;
  currentCrewId: string | null;
}

export default function CrewLeaderboardTable({
  entries,
  metric,
  currentCrewId,
}: CrewLeaderboardTableProps) {
  // Format currency using Intl.NumberFormat
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
  const getMetricLabel = (m: CrewLeaderboardMetric): string => {
    switch (m) {
      case "realizedPnl":
        return "Realized PnL";
      case "totalPnl":
        return "Total PnL";
      case "volume":
        return "Volume";
      case "avgWinRate":
        return "Avg Win Rate";
      default:
        return "";
    }
  };

  // Format metric value based on type
  const formatMetricValue = (
    entry: CrewLeaderboardEntry,
    m: CrewLeaderboardMetric
  ): string => {
    const value = entry.metricValue;
    if (m === "avgWinRate") {
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
            <h3 className="text-xl font-semibold text-white mb-2">No Crew Rankings Yet</h3>
            <p className="text-white/40 max-w-md">
              Rankings will appear here as more crews join the competition. Create or join a crew to start competing!
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
          <div className="col-span-1 text-center">Members</div>
          <div className="col-span-2 text-right">{getMetricLabel(metric)}</div>
          <div className="col-span-1 text-right">Trades</div>
          <div className="col-span-2 text-right">Volume</div>
          <div className="col-span-2 text-right">Trend</div>
        </div>
      </div>

      {/* Rows */}
      <div className="divide-y divide-[#1a1a1a]">
        {entries.map((entry, index) => {
          const rank = index + 1;
          const isCurrentCrew = entry.crewId === currentCrewId;

          return (
            <Link
              key={entry.crewId}
              href={`/crews/${entry.crewId}`}
              className={`relative block px-6 py-4 transition-all duration-200 hover:bg-white/[0.02] ${
                isCurrentCrew
                  ? "bg-accent/5 border-l-2 border-l-accent shadow-[inset_0_0_30px_rgba(168,85,247,0.05)]"
                  : ""
              }`}
            >
              {/* Current crew glow */}
              {isCurrentCrew && (
                <div className="absolute inset-0 bg-gradient-to-r from-accent/5 via-transparent to-transparent pointer-events-none" />
              )}

              <div className="relative grid grid-cols-12 gap-4 items-center">
                {/* Rank */}
                <div className="col-span-1">
                  {getRankDisplay(rank)}
                </div>

                {/* Crew */}
                <div className="col-span-3">
                  <div className="flex items-center gap-3">
                    {/* Avatar */}
                    <div className={`relative h-10 w-10 rounded-full overflow-hidden bg-[#1a1a1a] flex items-center justify-center border ${
                      isCurrentCrew ? "border-accent/50" : "border-[#2a2a2a]"
                    }`}>
                      <Users className="w-5 h-5 text-white/40" />
                    </div>

                    {/* Name */}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className={`font-medium truncate ${isCurrentCrew ? "text-white" : "text-white/90"}`}>
                          {entry.crewName}
                        </span>
                        {isCurrentCrew && (
                          <span className="px-1.5 py-0.5 text-[10px] font-medium bg-accent/20 text-accent rounded">
                            YOUR CREW
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Members */}
                <div className="col-span-1 text-center">
                  <div className="flex items-center justify-center gap-1">
                    <Users className="w-3 h-3 text-white/40" />
                    <span className="text-sm text-white/60">{entry.memberCount}</span>
                  </div>
                </div>

                {/* Metric Value */}
                <div className="col-span-2 text-right">
                  <span
                    className={`text-lg font-bold ${
                      metric === "avgWinRate"
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
                  <span className="text-sm text-white/60">${formatNumber(entry.totalVolume)}</span>
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
            </Link>
          );
        })}
      </div>
    </div>
  );
}
