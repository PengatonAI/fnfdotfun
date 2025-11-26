"use client";

import Link from "next/link";
import Image from "next/image";
import { getUserInitial, formatUsernameWithHandle } from "@/lib/user-utils";
import { 
  TrendingUp, 
  DollarSign, 
  BarChart3, 
  Percent,
  Trophy,
  Medal,
  Target,
  Wallet,
  Star,
  ChevronRight
} from "lucide-react";

interface User {
  id: string;
  username: string | null;
  image: string | null;
  xHandle: string | null;
  name?: string | null;
  email?: string | null;
}

interface SeasonPnL {
  realizedPnl: number;
  totalPnl: number;
  winRate: number;
  totalTrades: number;
  volume: number;
}

interface Tournament {
  id: string;
  name: string;
  startAt: Date;
  endAt: Date;
  userJoined: boolean;
  crewJoined: boolean;
}

interface StatsDashboardCardProps {
  user: User;
  seasonPnL: SeasonPnL | null;
  tournaments: Tournament[];
  userBestRank?: number | null;
  userPerformance?: number | null;
  totalPrizePool?: number;
  userContribution?: number;
  bestPerformance?: number | null;
}

function formatCurrency(value: number): string {
  const absValue = Math.abs(value);
  const prefix = value >= 0 ? "+" : "-";
  if (absValue >= 1000000) {
    return `${prefix}$${(absValue / 1000000).toFixed(1)}M`;
  }
  if (absValue >= 1000) {
    return `${prefix}$${(absValue / 1000).toFixed(1)}K`;
  }
  return `${prefix}$${absValue.toFixed(0)}`;
}

function formatLargeNumber(value: number): string {
  if (value >= 1000000) {
    return `$${(value / 1000000).toFixed(1)}M`;
  }
  if (value >= 1000) {
    return `$${(value / 1000).toFixed(1)}K`;
  }
  return `$${value.toFixed(0)}`;
}

function formatPercent(value: number): string {
  return `${(value * 100).toFixed(0)}%`;
}

export function StatsDashboardCard({
  user,
  seasonPnL,
  tournaments,
  userBestRank,
  userPerformance,
  totalPrizePool = 0,
  userContribution = 0,
  bestPerformance,
}: StatsDashboardCardProps) {
  const activeTournamentCount = tournaments.length;

  return (
    <Link
      href="/profile"
      className="relative rounded-2xl overflow-hidden bg-gradient-to-br from-[#0d0d0d] via-[#111111] to-[#0a0a0a] border border-[#1a1a1a] shadow-[0_4px_20px_rgba(0,0,0,0.3)] h-full flex flex-col transition-all duration-300 hover:border-[#2a2a2a] hover:shadow-[0_8px_40px_rgba(0,0,0,0.4)] group"
    >
      {/* Decorative glow */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-24 -right-24 w-64 h-64 bg-gradient-to-br from-accent/10 to-transparent rounded-full blur-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
      </div>

      <div className="relative p-6 flex flex-col h-full">
        {/* Profile Header */}
        <div className="flex items-center gap-3 mb-6">
          {/* Avatar with glow */}
          <div className="relative flex-shrink-0">
            <div className="absolute -inset-0.5 bg-gradient-to-r from-accent/40 via-purple-500/40 to-pink-500/40 rounded-full blur-sm opacity-60" />
            {user.image ? (
              <div className="relative w-12 h-12 rounded-full overflow-hidden border-2 border-[#2a2a2a]">
                <Image
                  src={user.image}
                  alt={formatUsernameWithHandle(user)}
                  width={48}
                  height={48}
                  className="object-cover"
                />
              </div>
            ) : (
              <div className="relative w-12 h-12 rounded-full bg-gradient-to-br from-accent/30 to-accent/10 border-2 border-accent/30 flex items-center justify-center">
                <span className="text-lg font-semibold text-accent">
                  {getUserInitial(user)}
                </span>
              </div>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-lg font-semibold text-white">Your Stats</h2>
            <p className="text-sm text-white/40 truncate">{formatUsernameWithHandle(user)}</p>
          </div>
          <ChevronRight className="w-5 h-5 text-white/30 group-hover:text-white/60 transition-colors" />
        </div>

        {/* Stats Grid */}
        {seasonPnL ? (
          <div className="grid grid-cols-2 gap-4 mb-6">
            {/* Total PnL */}
            <div className="flex flex-col p-3 rounded-xl bg-[#0a0a0a] border border-[#1a1a1a]">
              <div className="flex items-center gap-1.5 text-xs text-white/40 mb-1">
                <DollarSign className="w-3.5 h-3.5" />
                Total PnL
              </div>
              <span className={`text-xl font-bold ${seasonPnL.totalPnl >= 0 ? "text-[#00d57a]" : "text-[#ff4a4a]"}`}>
                {formatCurrency(seasonPnL.totalPnl)}
              </span>
            </div>

            {/* Realized Profit */}
            <div className="flex flex-col p-3 rounded-xl bg-[#0a0a0a] border border-[#1a1a1a]">
              <div className="flex items-center gap-1.5 text-xs text-white/40 mb-1">
                <TrendingUp className="w-3.5 h-3.5" />
                Realized Profit
              </div>
              <span className={`text-xl font-bold ${seasonPnL.realizedPnl >= 0 ? "text-[#00d57a]" : "text-[#ff4a4a]"}`}>
                {formatCurrency(seasonPnL.realizedPnl)}
              </span>
            </div>

            {/* Trading Volume */}
            <div className="flex flex-col p-3 rounded-xl bg-[#0a0a0a] border border-[#1a1a1a]">
              <div className="flex items-center gap-1.5 text-xs text-white/40 mb-1">
                <BarChart3 className="w-3.5 h-3.5" />
                Trading Volume
              </div>
              <span className="text-xl font-bold text-white">
                {formatLargeNumber(seasonPnL.volume)}
              </span>
            </div>

            {/* Win Rate */}
            <div className="flex flex-col p-3 rounded-xl bg-[#0a0a0a] border border-[#1a1a1a]">
              <div className="flex items-center gap-1.5 text-xs text-white/40 mb-1">
                <Percent className="w-3.5 h-3.5" />
                Win Rate
              </div>
              <span className="text-xl font-bold text-[#00d57a]">
                {formatPercent(seasonPnL.winRate)}
              </span>
            </div>
          </div>
        ) : (
          <div className="mb-6 flex items-center justify-center py-6 rounded-xl bg-[#0a0a0a] border border-[#1a1a1a]">
            <p className="text-white/30 text-sm text-center">
              No active season. Stats will appear here when a season starts.
            </p>
          </div>
        )}

        {/* Divider */}
        <div className="border-t border-[#1a1a1a] mb-6" />

        {/* Tournaments Section */}
        <h3 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
          <Trophy className="w-4 h-4 text-accent" />
          Tournaments
        </h3>

        {/* Tournaments Stats Grid - 3x2 layout */}
        <div className="grid grid-cols-3 gap-3 flex-1">
          {/* Active Tournaments */}
          <div className="flex flex-col p-2.5 rounded-lg bg-[#0a0a0a]/50 border border-[#1a1a1a]">
            <div className="flex items-center gap-1 text-[10px] text-white/40 mb-0.5 uppercase tracking-wider">
              <Trophy className="w-3 h-3" />
              Active
            </div>
            <span className="text-lg font-bold text-white">
              #{activeTournamentCount}
            </span>
          </div>

          {/* Your Best Rank */}
          <div className="flex flex-col p-2.5 rounded-lg bg-[#0a0a0a]/50 border border-[#1a1a1a]">
            <div className="flex items-center gap-1 text-[10px] text-white/40 mb-0.5 uppercase tracking-wider">
              <Medal className="w-3 h-3" />
              Best Rank
            </div>
            <span className="text-lg font-bold text-white">
              {userBestRank ? `#${userBestRank}` : "—"}
            </span>
          </div>

          {/* Your Performance */}
          <div className="flex flex-col p-2.5 rounded-lg bg-[#0a0a0a]/50 border border-[#1a1a1a]">
            <div className="flex items-center gap-1 text-[10px] text-white/40 mb-0.5 uppercase tracking-wider">
              <Target className="w-3 h-3" />
              Perf.
            </div>
            <span className={`text-lg font-bold ${userPerformance && userPerformance > 0 ? "text-[#00d57a]" : "text-white"}`}>
              {userPerformance ? `+${userPerformance}%` : "—"}
            </span>
          </div>

          {/* Prize Pool */}
          <div className="flex flex-col p-2.5 rounded-lg bg-[#0a0a0a]/50 border border-[#1a1a1a]">
            <div className="flex items-center gap-1 text-[10px] text-white/40 mb-0.5 uppercase tracking-wider">
              <DollarSign className="w-3 h-3" />
              Prize Pool
            </div>
            <span className="text-lg font-bold text-white">
              ${totalPrizePool.toLocaleString()}
            </span>
          </div>

          {/* Your Contribution */}
          <div className="flex flex-col p-2.5 rounded-lg bg-[#0a0a0a]/50 border border-[#1a1a1a]">
            <div className="flex items-center gap-1 text-[10px] text-white/40 mb-0.5 uppercase tracking-wider">
              <Wallet className="w-3 h-3" />
              Contrib.
            </div>
            <span className="text-lg font-bold text-white">
              ${userContribution.toLocaleString()}
            </span>
          </div>

          {/* Best Performance */}
          <div className="flex flex-col p-2.5 rounded-lg bg-[#0a0a0a]/50 border border-[#1a1a1a]">
            <div className="flex items-center gap-1 text-[10px] text-white/40 mb-0.5 uppercase tracking-wider">
              <Star className="w-3 h-3" />
              Best Perf.
            </div>
            <span className={`text-lg font-bold ${bestPerformance && bestPerformance > 0 ? "text-[#00d57a]" : "text-white"}`}>
              {bestPerformance ? `+${bestPerformance}%` : "—"}
            </span>
          </div>
        </div>

        {/* Active tournament badges at bottom */}
        {tournaments.length > 0 && (
          <div className="mt-4 pt-4 border-t border-[#1a1a1a]">
            <div className="flex flex-wrap gap-2">
              {tournaments.slice(0, 3).map((tournament) => (
                <span
                  key={tournament.id}
                  className={`text-xs px-2.5 py-1 rounded-full ${
                    tournament.userJoined
                      ? "bg-[#00d57a]/20 text-[#00d57a] border border-[#00d57a]/30"
                      : "bg-accent/20 text-accent border border-accent/30"
                  }`}
                >
                  {tournament.userJoined ? "✓ " : ""}{tournament.name.slice(0, 15)}{tournament.name.length > 15 ? "..." : ""}
                </span>
              ))}
              {tournaments.length > 3 && (
                <span className="text-xs px-2 py-1 text-white/30">
                  +{tournaments.length - 3} more
                </span>
              )}
            </div>
          </div>
        )}
      </div>
    </Link>
  );
}
