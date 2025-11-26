"use client";

import Link from "next/link";
import { Trophy, TrendingUp, Crown, Users, BarChart3, Target } from "lucide-react";

interface LeaderboardHeroProps {
  type: "user" | "crew";
  avatar: string | null;
  title: string;
  subtitle?: string;
  rank: number | null;
  totalRanked: number;
  pnl: number;
  winRate: number;
  trades: number;
  volume: number;
  crewBadge?: {
    id: string;
    name: string;
    avatarUrl?: string | null;
  } | null;
  isLoading?: boolean;
}

export function LeaderboardHero({
  type,
  avatar,
  title,
  subtitle,
  rank,
  totalRanked,
  pnl,
  winRate,
  trades,
  volume,
  crewBadge,
  isLoading = false,
}: LeaderboardHeroProps) {
  // Calculate top percent
  const topPercent = rank && totalRanked > 0 ? Math.round((rank / totalRanked) * 100) : null;

  // Format currency
  const formatCurrency = (value: number): string => {
    const absValue = Math.abs(value);
    const prefix = value >= 0 ? "+$" : "-$";
    if (absValue >= 1000000) {
      return `${prefix}${(absValue / 1000000).toFixed(2)}M`;
    }
    if (absValue >= 1000) {
      return `${prefix}${(absValue / 1000).toFixed(1)}K`;
    }
    return `${prefix}${absValue.toFixed(2)}`;
  };

  // Format number
  const formatNumber = (value: number): string => {
    if (value >= 1000000) {
      return `${(value / 1000000).toFixed(1)}M`;
    }
    if (value >= 1000) {
      return `${(value / 1000).toFixed(1)}K`;
    }
    return value.toLocaleString();
  };

  const initial = title?.[0]?.toUpperCase() || "?";

  return (
    <div className="relative rounded-2xl overflow-hidden bg-gradient-to-br from-[#0d0d0d] via-[#111111] to-[#0a0a0a] border border-[#1a1a1a] shadow-[0_8px_40px_rgba(0,0,0,0.5)]">
      {/* Background decorative elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-24 -right-24 w-96 h-96 bg-gradient-to-br from-yellow-500/5 to-transparent rounded-full blur-3xl" />
        <div className="absolute -bottom-24 -left-24 w-64 h-64 bg-gradient-to-tr from-accent/5 to-transparent rounded-full blur-3xl" />
        {/* Grid pattern overlay */}
        <div 
          className="absolute inset-0 opacity-[0.02]"
          style={{
            backgroundImage: `linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)`,
            backgroundSize: '40px 40px'
          }}
        />
      </div>

      <div className="relative p-6 lg:p-8">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
          {/* Left: Avatar + Info */}
          <div className="flex items-center gap-5">
            {/* Avatar with Rank Glow */}
            <div className="relative flex-shrink-0 group">
              {rank === 1 && (
                <div className="absolute -inset-2 bg-gradient-to-r from-yellow-400/40 via-yellow-500/40 to-yellow-600/40 rounded-full blur-lg animate-pulse" />
              )}
              <div className="absolute -inset-1 bg-gradient-to-r from-accent/50 via-purple-500/50 to-pink-500/50 rounded-full opacity-0 group-hover:opacity-100 blur-md transition-opacity duration-300" />
              
              {avatar ? (
                <div className="relative w-20 h-20 lg:w-24 lg:h-24 rounded-full overflow-hidden border-2 border-[#2a2a2a] shadow-[0_4px_20px_rgba(0,0,0,0.4)]">
                  <img
                    src={avatar}
                    alt={title}
                    className="w-full h-full object-cover"
                  />
                </div>
              ) : (
                <div className="relative w-20 h-20 lg:w-24 lg:h-24 rounded-full bg-gradient-to-br from-accent/30 to-accent/10 border-2 border-accent/30 flex items-center justify-center shadow-[0_4px_20px_rgba(0,0,0,0.4)]">
                  {type === "crew" ? (
                    <Users className="w-10 h-10 text-accent" />
                  ) : (
                    <span className="text-2xl lg:text-3xl font-bold text-accent">{initial}</span>
                  )}
                </div>
              )}

              {/* Rank Badge Overlay */}
              <div className="absolute -bottom-1 -right-1 w-8 h-8 lg:w-9 lg:h-9 rounded-full bg-gradient-to-br from-[#0d0d0d] to-[#1a1a1a] border-2 border-[#2a2a2a] flex items-center justify-center shadow-lg">
                {rank === 1 ? (
                  <Crown className="w-4 h-4 text-yellow-400" />
                ) : rank ? (
                  <span className="text-xs font-bold text-white">#{rank}</span>
                ) : (
                  <span className="text-xs text-white/40">—</span>
                )}
              </div>
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-3 mb-1">
                <h1 className="text-xl lg:text-2xl font-bold text-white tracking-tight">
                  {type === "user" ? "Your Ranking" : "Your Crew"}
                </h1>
                {rank === 1 && (
                  <div className="flex items-center gap-1.5 px-2.5 py-1 bg-yellow-500/20 border border-yellow-500/40 rounded-full">
                    <Trophy className="w-3.5 h-3.5 text-yellow-400" />
                    <span className="text-xs font-bold text-yellow-400">#1</span>
                  </div>
                )}
              </div>
              
              <p className="text-base lg:text-lg text-white/70 mb-2 truncate">
                {isLoading ? "Loading..." : title}
              </p>

              {/* Badges Row */}
              <div className="flex flex-wrap items-center gap-2">
                {/* Crew Badge (for user type) */}
                {type === "user" && crewBadge && (
                  <Link 
                    href={`/crews/${crewBadge.id}`}
                    className="flex items-center gap-1.5 px-2.5 py-1 bg-accent/10 border border-accent/30 rounded-full hover:bg-accent/20 transition-colors"
                  >
                    {crewBadge.avatarUrl ? (
                      <img src={crewBadge.avatarUrl} alt="" className="w-3.5 h-3.5 rounded-full" />
                    ) : (
                      <Users className="w-3.5 h-3.5 text-accent" />
                    )}
                    <span className="text-xs font-medium text-accent">{crewBadge.name}</span>
                  </Link>
                )}

                {/* Member count (for crew type) */}
                {type === "crew" && subtitle && (
                  <div className="flex items-center gap-1.5 px-2.5 py-1 bg-white/5 border border-white/10 rounded-full">
                    <Users className="w-3.5 h-3.5 text-white/60" />
                    <span className="text-xs text-white/60">{subtitle}</span>
                  </div>
                )}
                
                {/* Top X% Badge */}
                {topPercent !== null && topPercent <= 25 && (
                  <div className="flex items-center gap-1.5 px-2.5 py-1 bg-emerald-500/10 border border-emerald-500/30 rounded-full">
                    <TrendingUp className="w-3 h-3 text-emerald-400" />
                    <span className="text-xs font-medium text-emerald-400">Top {topPercent}%</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Right: Stats Grid */}
          <div className="flex items-center gap-4 lg:gap-6 flex-shrink-0">
            {/* Rank */}
            <div className="text-center min-w-[60px]">
              <div className={`text-2xl lg:text-3xl font-bold ${rank ? "text-white" : "text-white/40"}`}>
                {isLoading ? "..." : rank ? `#${rank}` : "—"}
              </div>
              <div className="text-[10px] lg:text-xs text-white/40 uppercase tracking-wider">
                {rank ? "Rank" : "Not Ranked"}
              </div>
            </div>
            
            <div className="w-px h-10 bg-white/10" />
            
            {/* PnL */}
            <div className="text-center min-w-[80px]">
              <div className={`text-xl lg:text-2xl font-bold ${pnl >= 0 ? "text-[#00d57a]" : "text-[#ff4a4a]"}`}>
                {isLoading ? "..." : formatCurrency(pnl)}
              </div>
              <div className="text-[10px] lg:text-xs text-white/40 uppercase tracking-wider">PnL</div>
            </div>
            
            <div className="w-px h-10 bg-white/10" />
            
            {/* Win Rate */}
            <div className="text-center min-w-[60px]">
              <div className={`text-xl lg:text-2xl font-bold ${winRate >= 0.5 ? "text-[#00d57a]" : "text-white"}`}>
                {isLoading ? "..." : `${(winRate * 100).toFixed(0)}%`}
              </div>
              <div className="text-[10px] lg:text-xs text-white/40 uppercase tracking-wider">Win Rate</div>
            </div>
            
            <div className="w-px h-10 bg-white/10 hidden lg:block" />
            
            {/* Trades */}
            <div className="text-center min-w-[50px] hidden lg:block">
              <div className="text-xl lg:text-2xl font-bold text-white">
                {isLoading ? "..." : formatNumber(trades)}
              </div>
              <div className="text-[10px] lg:text-xs text-white/40 uppercase tracking-wider">Trades</div>
            </div>
            
            <div className="w-px h-10 bg-white/10 hidden lg:block" />
            
            {/* Volume */}
            <div className="text-center min-w-[70px] hidden lg:block">
              <div className="text-xl lg:text-2xl font-bold text-white">
                {isLoading ? "..." : `$${formatNumber(volume)}`}
              </div>
              <div className="text-[10px] lg:text-xs text-white/40 uppercase tracking-wider">Volume</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Empty state for when user has no rank or crew
export function LeaderboardHeroEmpty({ type }: { type: "user" | "crew" }) {
  return (
    <div className="relative rounded-2xl overflow-hidden bg-gradient-to-br from-[#0d0d0d] via-[#111111] to-[#0a0a0a] border border-[#1a1a1a] shadow-[0_8px_40px_rgba(0,0,0,0.5)]">
      {/* Background decorative elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-24 -right-24 w-96 h-96 bg-gradient-to-br from-accent/5 to-transparent rounded-full blur-3xl" />
        <div className="absolute -bottom-24 -left-24 w-64 h-64 bg-gradient-to-tr from-emerald-500/5 to-transparent rounded-full blur-3xl" />
      </div>

      <div className="relative p-6 lg:p-8">
        <div className="flex flex-col items-center justify-center py-4 text-center">
          <div className="w-16 h-16 rounded-full bg-accent/10 border border-accent/20 flex items-center justify-center mb-4">
            {type === "crew" ? (
              <Users className="w-8 h-8 text-accent/60" />
            ) : (
              <Target className="w-8 h-8 text-accent/60" />
            )}
          </div>
          <h2 className="text-lg font-semibold text-white mb-2">
            {type === "crew" ? "Join a Crew" : "Start Trading"}
          </h2>
          <p className="text-white/40 max-w-md text-sm">
            {type === "crew" 
              ? "You're not part of a crew yet. Join or create a crew to compete in the crew leaderboard!"
              : "Complete some trades to appear on the leaderboard and track your ranking."
            }
          </p>
          {type === "crew" && (
            <Link
              href="/crews"
              className="mt-4 px-5 py-2 bg-accent/10 border border-accent/30 rounded-lg text-accent text-sm hover:bg-accent/20 transition-colors"
            >
              Browse Crews
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}

