"use client";

import { useState } from "react";
import useSWR from "swr";
import { fetcher } from "@/lib/swr-fetcher";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { getPublicDisplayName, formatUsernameWithHandle, getUserInitial } from "@/lib/user-utils";
import { Sparkline } from "@/app/dashboard/components/sparkline";
import { 
  Search, 
  Users, 
  Trophy, 
  TrendingUp, 
  Clock, 
  Plus,
  Crown,
  Shield,
  BarChart3,
  Filter,
  Percent,
  UserPlus,
  ChevronRight
} from "lucide-react";

interface User {
  id: string;
  name: string | null;
  email: string | null;
  image: string | null;
  username: string | null;
  xHandle: string | null;
}

interface CrewMember {
  id: string;
  joinedAt: string;
  user: User;
}

interface Crew {
  id: string;
  name: string;
  description: string | null;
  openToMembers: boolean;
  createdByUserId: string;
  createdBy: User;
  members: CrewMember[];
  createdAt: string;
  updatedAt: string;
  joinRequests?: { id: string }[];
  avatarUrl?: string | null;
  tagline?: string | null;
}

interface CrewsClientProps {
  userCrew: Crew | null;
  otherCrews: Crew[];
  userId: string;
}

interface SearchResult {
  id: string;
  name: string;
  description: string | null;
  openToMembers: boolean;
  memberCount: number;
  maxMembers: number;
  hasPendingRequest: boolean;
  creator: {
    id: string;
    username: string | null;
    xHandle: string | null;
  };
  createdAt: string;
}

// Format currency with fallback
const formatCurrency = (value: number | null | undefined): string => {
  if (value === null || value === undefined) return "--";
  const absValue = Math.abs(value);
  const prefix = value >= 0 ? "+$" : "-$";
  if (absValue >= 1000000) {
    return `${prefix}${(absValue / 1000000).toFixed(1)}M`;
  }
  if (absValue >= 1000) {
    return `${prefix}${(absValue / 1000).toFixed(1)}K`;
  }
  return `${prefix}${absValue.toFixed(0)}`;
};

// Format number with fallback
const formatNumber = (value: number | null | undefined): string => {
  if (value === null || value === undefined) return "--";
  if (value >= 1000000) {
    return `${(value / 1000000).toFixed(1)}M`;
  }
  if (value >= 1000) {
    return `${(value / 1000).toFixed(1)}K`;
  }
  return value.toLocaleString();
};

// Format win rate with fallback
const formatWinRate = (value: number | null | undefined): string => {
  if (value === null || value === undefined) return "--";
  return `${(value * 100).toFixed(0)}%`;
};

// Check if value is valid (not null/undefined and > 0 for meaningful display)
const hasValue = (value: number | null | undefined): boolean => {
  return value !== null && value !== undefined;
};

// ═══════════════════════════════════════════════════════════════════════
// SIMPLE PAGE HEADER
// ═══════════════════════════════════════════════════════════════════════
function PageHeader() {
  return (
    <div className="mb-8">
      <h1 className="text-white text-xl font-semibold mb-2">
        Browse elite trading crews.
      </h1>
      <p className="text-white/60 text-sm">
        Join, challenge, or explore their stats.
      </p>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════
// PREMIUM YOUR CREW CARD - Uses real API data
// ═══════════════════════════════════════════════════════════════════════
function YourCrewCard({ crew, userId }: { crew: Crew; userId: string }) {
  const isCreator = crew.createdByUserId === userId;
  const pendingRequestCount = crew.joinRequests?.length || 0;
  const memberCount = crew.members.length;
  const slotsLeft = 5 - memberCount;

  // Fetch real PnL data from API
  const { data: pnlData, isLoading: loadingPnl } = useSWR(
    `/api/crews/${crew.id}/pnl`,
    fetcher,
    { refreshInterval: 15000 }
  );

  // Fetch real trades/sparkline data from API
  const { data: tradesData, isLoading: loadingTrades } = useSWR(
    `/api/crews/${crew.id}/trades`,
    fetcher,
    { refreshInterval: 30000 }
  );

  // Extract real stats from API response
  const crewStats = pnlData?.crew;
  const sparklineData = tradesData?.sparklineData;

  // Determine sparkline color based on real PnL
  const pnlValue = crewStats?.totalPnL;
  const sparklineColor = pnlValue !== null && pnlValue !== undefined && pnlValue >= 0 ? "#00d57a" : "#ff4a4a";

  return (
    <div className="relative rounded-2xl overflow-hidden bg-gradient-to-br from-[#0d0d0d] via-[#111111] to-[#0a0a0a] border border-[#1a1a1a] shadow-[0_8px_40px_rgba(0,0,0,0.5)]">
      {/* Decorative glows */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-24 -right-24 w-64 h-64 bg-gradient-to-br from-accent/10 to-transparent rounded-full blur-3xl" />
        <div className="absolute -bottom-24 -left-24 w-48 h-48 bg-gradient-to-tr from-emerald-500/5 to-transparent rounded-full blur-3xl" />
      </div>

      <div className="relative p-6 lg:p-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-white flex items-center gap-2">
            <Shield className="w-5 h-5 text-accent" />
            Your Crew
          </h2>
          {isCreator && pendingRequestCount > 0 && (
            <div className="flex items-center gap-2 px-3 py-1.5 bg-orange-500/10 border border-orange-500/30 rounded-full">
              <UserPlus className="w-3.5 h-3.5 text-orange-400" />
              <span className="text-xs font-medium text-orange-400">
                {pendingRequestCount} Join Request{pendingRequestCount !== 1 ? "s" : ""}
              </span>
            </div>
          )}
        </div>

        <div className="flex flex-col lg:flex-row gap-6">
          {/* Left: Crew Info */}
          <div className="flex items-start gap-4 flex-1">
            {/* Avatar with glow */}
            <div className="relative flex-shrink-0 group">
              <div className="absolute -inset-1 bg-gradient-to-r from-accent/50 via-purple-500/50 to-pink-500/50 rounded-full opacity-50 blur-md" />
              {crew.avatarUrl ? (
                <div className="relative w-16 h-16 lg:w-20 lg:h-20 rounded-full overflow-hidden border-2 border-[#2a2a2a]">
                  <Image
                    src={crew.avatarUrl}
                    alt={crew.name}
                    width={80}
                    height={80}
                    className="object-cover"
                  />
                </div>
              ) : (
                <div className="relative w-16 h-16 lg:w-20 lg:h-20 rounded-full bg-gradient-to-br from-accent/30 to-accent/10 border-2 border-accent/30 flex items-center justify-center">
                  <span className="text-2xl lg:text-3xl font-bold text-accent">
                    {crew.name[0].toUpperCase()}
                  </span>
                </div>
              )}
              {isCreator && (
                <div className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-gradient-to-br from-yellow-400/80 to-yellow-600/80 border-2 border-[#0a0a0a] flex items-center justify-center">
                  <Crown className="w-3.5 h-3.5 text-white" />
                </div>
              )}
            </div>

            {/* Crew Info */}
            <div className="flex-1 min-w-0">
              <h3 className="text-xl font-bold text-white truncate">{crew.name}</h3>
              {crew.tagline || crew.description ? (
                <p className="text-sm text-white/50 mt-1 line-clamp-2">
                  {crew.tagline || crew.description}
                </p>
              ) : null}
              <div className="flex items-center gap-3 mt-2">
                <span className="text-xs text-white/40">
                  Created by {formatUsernameWithHandle(crew.createdBy)}
                </span>
              </div>
            </div>
          </div>

          {/* Right: Sparkline - Only show if we have real data */}
          <div className="lg:w-48 flex flex-col items-center justify-center min-h-[50px]">
            {loadingTrades ? (
              <div className="text-xs text-white/30">Loading...</div>
            ) : sparklineData && sparklineData.length > 1 ? (
              <Sparkline 
                data={sparklineData}
                width={180} 
                height={50} 
                color={sparklineColor}
              />
            ) : (
              <div className="w-full h-[50px] flex items-center justify-center border border-dashed border-[#1a1a1a] rounded-lg">
                <span className="text-xs text-white/20">No trend data</span>
              </div>
            )}
          </div>
        </div>

        {/* Stats Grid - Real data with "--" fallback */}
        <div className="grid grid-cols-5 gap-4 mt-6 pt-6 border-t border-[#1a1a1a]">
          <div className="text-center">
            <div className="text-lg font-bold text-white">{memberCount}/5</div>
            <div className="text-[10px] text-white/40 uppercase tracking-wider mt-1">Members</div>
          </div>
          <div className="text-center">
            <div className="text-lg font-bold text-white">
              {loadingPnl ? "..." : hasValue(crewStats?.totalTrades) ? formatNumber(crewStats.totalTrades) : "--"}
            </div>
            <div className="text-[10px] text-white/40 uppercase tracking-wider mt-1">Trades</div>
          </div>
          <div className="text-center">
            <div className={`text-lg font-bold ${
              hasValue(crewStats?.avgWinRate) && crewStats.avgWinRate >= 0.5 
                ? "text-[#00d57a]" 
                : hasValue(crewStats?.avgWinRate) 
                  ? "text-[#ff4a4a]" 
                  : "text-white/40"
            }`}>
              {loadingPnl ? "..." : formatWinRate(crewStats?.avgWinRate)}
            </div>
            <div className="text-[10px] text-white/40 uppercase tracking-wider mt-1">Win Rate</div>
          </div>
          <div className="text-center">
            <div className={`text-lg font-bold ${
              hasValue(crewStats?.totalPnL) && crewStats.totalPnL >= 0 
                ? "text-[#00d57a]" 
                : hasValue(crewStats?.totalPnL) 
                  ? "text-[#ff4a4a]" 
                  : "text-white/40"
            }`}>
              {loadingPnl ? "..." : formatCurrency(crewStats?.totalPnL)}
            </div>
            <div className="text-[10px] text-white/40 uppercase tracking-wider mt-1">PnL</div>
          </div>
          <div className="text-center">
            <div className="text-lg font-bold text-white">
              {loadingPnl ? "..." : hasValue(crewStats?.totalVolume) ? `$${formatNumber(crewStats.totalVolume)}` : "--"}
            </div>
            <div className="text-[10px] text-white/40 uppercase tracking-wider mt-1">Volume</div>
          </div>
        </div>

        {/* Members Row */}
        <div className="flex items-center justify-between mt-6 pt-6 border-t border-[#1a1a1a]">
          <div className="flex items-center gap-3">
            <span className="text-xs text-white/40 uppercase tracking-wider">Team</span>
            <div className="flex -space-x-2">
              {crew.members.slice(0, 5).map((member, idx) => (
                <div
                  key={member.id}
                  className="w-8 h-8 rounded-full border-2 border-[#0a0a0a] overflow-hidden bg-[#1a1a1a]"
                  style={{ zIndex: crew.members.length - idx }}
                >
                  {member.user.image ? (
                    <Image
                      src={member.user.image}
                      alt={getPublicDisplayName(member.user)}
                      width={32}
                      height={32}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-accent/10 text-xs font-medium text-accent">
                      {getUserInitial(member.user)}
                    </div>
                  )}
                </div>
              ))}
            </div>
            <span className="text-xs text-white/30">
              {slotsLeft > 0 ? `${slotsLeft} slot${slotsLeft !== 1 ? "s" : ""} open` : "Full"}
            </span>
          </div>

          {/* Tricolor View Crew Button */}
          <Link href={`/crews/${crew.id}`}>
            <div className="relative rounded-lg overflow-hidden">
              <div 
                className="absolute inset-0 rounded-lg p-[1px]"
                style={{
                  background: 'linear-gradient(90deg, #ff4a4a 0%, #ff4a4a 33.33%, #ffffff 33.33%, #ffffff 66.66%, #00d57a 66.66%, #00d57a 100%)',
                }}
              >
                <div className="w-full h-full rounded-[7px] bg-[#0a0a0a]" />
              </div>
              <Button 
                className="relative bg-transparent border-none text-white font-medium hover:bg-white/5 px-6"
              >
                View Crew
                <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            </div>
          </Link>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════
// PREMIUM SEARCH & FILTER BAR
// ═══════════════════════════════════════════════════════════════════════
function SearchFilterBar({
  searchQuery,
  setSearchQuery,
  sortBy,
  setSortBy,
  rankingMetric,
  setRankingMetric,
  timeframe,
  setTimeframe,
  onSearch,
  isSearching,
}: {
  searchQuery: string;
  setSearchQuery: (v: string) => void;
  sortBy: string;
  setSortBy: (v: string) => void;
  rankingMetric: string;
  setRankingMetric: (v: string) => void;
  timeframe: string;
  setTimeframe: (v: string) => void;
  onSearch: (e: React.FormEvent) => void;
  isSearching: boolean;
}) {
  const sortOptions = [
    { value: "top-ranked", label: "Top Ranked", icon: <Trophy className="w-4 h-4" /> },
    { value: "most-members", label: "Most Members", icon: <Users className="w-4 h-4" /> },
    { value: "newest", label: "Newest", icon: <Clock className="w-4 h-4" /> },
  ];

  const metricOptions = [
    { value: "pnl", label: "PnL", icon: <TrendingUp className="w-4 h-4" /> },
    { value: "winRate", label: "Win Rate", icon: <Percent className="w-4 h-4" /> },
    { value: "members", label: "Members", icon: <Users className="w-4 h-4" /> },
    { value: "volume", label: "Volume", icon: <BarChart3 className="w-4 h-4" /> },
  ];

  const timeframeOptions = [
    { value: "all", label: "All Time" },
    { value: "30d", label: "30 Days" },
    { value: "7d", label: "7 Days" },
  ];

  return (
    <div className="relative rounded-xl bg-gradient-to-br from-[#0d0d0d] via-[#111111] to-[#0a0a0a] border border-[#1a1a1a] p-5 shadow-[0_4px_20px_rgba(0,0,0,0.3)]">
      <div className="flex flex-col gap-6">
        {/* Search Input */}
        <form onSubmit={onSearch} className="flex gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/30" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search crews by name..."
              className="w-full h-12 pl-12 pr-4 rounded-lg bg-[#0a0a0a] text-white border border-[#1a1a1a] focus:outline-none focus:ring-2 focus:ring-accent/50 focus:border-accent/50 placeholder:text-white/30 transition-all"
            />
          </div>
          <Button 
            type="submit" 
            disabled={isSearching}
            className="h-12 px-6 bg-white text-black font-medium hover:bg-white/90 transition-all disabled:opacity-50"
          >
            {isSearching ? "Searching..." : "Search"}
          </Button>
        </form>

        {/* Filter Controls */}
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
          {/* Sort By */}
          <div className="flex flex-col gap-3">
            <label className="text-xs font-medium text-white/40 uppercase tracking-wider">Sort By</label>
            <div className="flex flex-wrap gap-2">
              {sortOptions.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => setSortBy(opt.value)}
                  className={`relative flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 ${
                    sortBy === opt.value
                      ? "bg-[#0a0a0a] text-white border border-white/20 shadow-[0_0_15px_rgba(168,85,247,0.2)] tricolor-hover-border"
                      : "bg-[#0a0a0a]/50 text-white/50 border border-[#1a1a1a] hover:text-white hover:bg-[#0a0a0a] hover:border-white/10"
                  }`}
                >
                  {opt.icon}
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Ranking Metric + Timeframe */}
          <div className="flex flex-wrap items-end gap-6">
            {/* Ranking Metric */}
            <div className="flex flex-col gap-3">
              <label className="text-xs font-medium text-white/40 uppercase tracking-wider flex items-center gap-2">
                <Filter className="w-3 h-3" />
                Ranking By
              </label>
              <div className="flex gap-2">
                {metricOptions.map((m) => (
                  <button
                    key={m.value}
                    onClick={() => setRankingMetric(m.value)}
                    className={`px-4 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 ${
                      rankingMetric === m.value
                        ? "bg-[#0a0a0a] text-white border border-white/20 shadow-[0_0_15px_rgba(168,85,247,0.2)] tricolor-hover-border"
                        : "bg-[#0a0a0a]/50 text-white/50 border border-[#1a1a1a] hover:text-white hover:bg-[#0a0a0a] hover:border-white/10"
                    }`}
                  >
                    {m.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Timeframe */}
            <div className="flex flex-col gap-3">
              <label className="text-xs font-medium text-white/40 uppercase tracking-wider flex items-center gap-2">
                <Clock className="w-3 h-3" />
                Timeframe
              </label>
              <div className="flex gap-2">
                {timeframeOptions.map((t) => (
                  <button
                    key={t.value}
                    onClick={() => setTimeframe(t.value)}
                    className={`px-4 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 ${
                      timeframe === t.value
                        ? "bg-[#0a0a0a] text-white border border-white/20 shadow-[0_0_15px_rgba(168,85,247,0.2)] tricolor-hover-border"
                        : "bg-[#0a0a0a]/50 text-white/50 border border-[#1a1a1a] hover:text-white hover:bg-[#0a0a0a] hover:border-white/10"
                    }`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════
// PREMIUM CREW CARD (Grid Item) - Shows "--" for unavailable stats
// ═══════════════════════════════════════════════════════════════════════
function CrewCard({ 
  crew, 
  onRequestJoin,
  hasPendingRequest = false,
}: { 
  crew: Crew;
  onRequestJoin: (crewId: string) => void;
  hasPendingRequest?: boolean;
}) {
  const memberCount = crew.members?.length || 0;
  const slotsLeft = 5 - memberCount;

  // No stats available for browse cards without backend changes
  // Show "--" for all metrics as we don't have the data

  return (
    <div className="relative rounded-xl overflow-hidden bg-gradient-to-br from-[#0d0d0d] via-[#111111] to-[#0a0a0a] border border-[#1a1a1a] shadow-[0_4px_20px_rgba(0,0,0,0.3)] transition-all duration-300 hover:border-[#2a2a2a] hover:shadow-[0_8px_40px_rgba(0,0,0,0.4)] group">
      {/* Decorative glow on hover */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-12 -right-12 w-32 h-32 bg-gradient-to-br from-accent/5 to-transparent rounded-full blur-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
      </div>

      <div className="relative p-5">
        {/* Header: Avatar + Name */}
        <div className="flex items-start gap-4 mb-4">
          {/* Avatar with neon ring */}
          <div className="relative flex-shrink-0">
            <div className="absolute -inset-0.5 bg-gradient-to-r from-accent/40 via-purple-500/40 to-pink-500/40 rounded-full blur-sm opacity-60" />
            {crew.avatarUrl ? (
              <div className="relative w-14 h-14 rounded-full overflow-hidden border-2 border-[#2a2a2a]">
                <Image
                  src={crew.avatarUrl}
                  alt={crew.name}
                  width={56}
                  height={56}
                  className="object-cover"
                />
              </div>
            ) : (
              <div className="relative w-14 h-14 rounded-full bg-gradient-to-br from-accent/30 to-accent/10 border-2 border-accent/30 flex items-center justify-center">
                <span className="text-xl font-bold text-accent">
                  {crew.name[0].toUpperCase()}
                </span>
              </div>
            )}
          </div>

          <div className="flex-1 min-w-0">
            <h3 className="font-bold text-white truncate">{crew.name}</h3>
            {(crew.tagline || crew.description) && (
              <p className="text-xs text-white/40 mt-0.5 line-clamp-1">
                {crew.tagline || crew.description}
              </p>
            )}
          </div>
        </div>

        {/* Stats Row - Show "--" for all stats (no data available without fetching) */}
        <div className="grid grid-cols-4 gap-2 py-3 border-y border-[#1a1a1a]">
          <div className="text-center">
            <div className="text-sm font-semibold text-white">{memberCount}/5</div>
            <div className="text-[9px] text-white/30 uppercase tracking-wider">Members</div>
          </div>
          <div className="text-center">
            <div className="text-sm font-semibold text-white/40">--</div>
            <div className="text-[9px] text-white/30 uppercase tracking-wider">Win Rate</div>
          </div>
          <div className="text-center">
            <div className="text-sm font-semibold text-white/40">--</div>
            <div className="text-[9px] text-white/30 uppercase tracking-wider">Volume</div>
          </div>
          <div className="text-center">
            <div className="text-sm font-semibold text-white/40">--</div>
            <div className="text-[9px] text-white/30 uppercase tracking-wider">PnL</div>
          </div>
        </div>

        {/* Trend area - Show empty state (no data available) */}
        <div className="py-3 flex justify-center">
          <div className="w-full h-[35px] flex items-center justify-center border border-dashed border-[#1a1a1a] rounded-lg">
            <span className="text-[10px] text-white/20">View crew for stats</span>
          </div>
        </div>

        {/* Bottom Actions */}
        <div className="flex gap-2 mt-3">
          {/* Tricolor View Button */}
          <Link href={`/crews/${crew.id}`} className="flex-1">
            <div className="relative rounded-lg overflow-hidden w-full">
              <div 
                className="absolute inset-0 rounded-lg p-[1px]"
                style={{
                  background: 'linear-gradient(90deg, #ff4a4a 0%, #ff4a4a 33.33%, #ffffff 33.33%, #ffffff 66.66%, #00d57a 66.66%, #00d57a 100%)',
                }}
              >
                <div className="w-full h-full rounded-[7px] bg-[#0a0a0a]" />
              </div>
              <Button 
                className="relative w-full bg-transparent border-none text-white font-medium hover:bg-white/5 text-sm"
              >
                View Crew
              </Button>
            </div>
          </Link>

          {/* Join Button */}
          {hasPendingRequest ? (
            <Button 
              variant="outline" 
              size="sm" 
              disabled 
              className="flex-1 bg-[#0a0a0a] border-[#1a1a1a] text-white/40"
            >
              Pending
            </Button>
          ) : !crew.openToMembers ? (
            <Button 
              variant="outline" 
              size="sm" 
              disabled 
              className="flex-1 bg-[#0a0a0a] border-[#1a1a1a] text-white/40"
            >
              Invite Only
            </Button>
          ) : slotsLeft === 0 ? (
            <Button 
              variant="outline" 
              size="sm" 
              disabled 
              className="flex-1 bg-[#0a0a0a] border-[#1a1a1a] text-white/40"
            >
              Full
            </Button>
          ) : (
            <Button 
              size="sm" 
              onClick={() => onRequestJoin(crew.id)}
              className="flex-1 bg-accent hover:bg-accent/90 text-white"
            >
              <UserPlus className="w-3.5 h-3.5 mr-1.5" />
              Join
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════
// CREATE CREW CARD
// ═══════════════════════════════════════════════════════════════════════
function CreateCrewSection({
  showForm,
  setShowForm,
  onSubmit,
  isCreating,
  error,
  openToMembers,
  setOpenToMembers,
  onCancel,
}: {
  showForm: boolean;
  setShowForm: (v: boolean) => void;
  onSubmit: (e: React.FormEvent<HTMLFormElement>) => void;
  isCreating: boolean;
  error: string | null;
  openToMembers: boolean;
  setOpenToMembers: (v: boolean) => void;
  onCancel: () => void;
}) {
  return (
    <div className="relative rounded-xl overflow-hidden bg-gradient-to-br from-[#0d0d0d] via-[#111111] to-[#0a0a0a] border border-[#1a1a1a] shadow-[0_4px_20px_rgba(0,0,0,0.3)] p-6">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-12 -right-12 w-32 h-32 bg-gradient-to-br from-accent/5 to-transparent rounded-full blur-2xl" />
      </div>

      <div className="relative">
        {!showForm ? (
          <div className="flex flex-col items-center text-center py-4">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-accent/20 to-accent/5 border border-accent/20 flex items-center justify-center mb-4">
              <Plus className="w-8 h-8 text-accent" />
            </div>
            <h3 className="text-lg font-semibold text-white mb-2">Start Your Own Crew</h3>
            <p className="text-sm text-white/40 mb-6 max-w-sm">
              Lead a team of elite traders. Build your legacy together.
            </p>
            <Button 
              onClick={() => setShowForm(true)}
              className="bg-white text-black font-medium hover:bg-white/90 px-8"
            >
              Create Crew
            </Button>
          </div>
        ) : (
          <form onSubmit={onSubmit} className="space-y-5">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-lg bg-accent/10 flex items-center justify-center">
                <Plus className="w-5 h-5 text-accent" />
              </div>
              <h3 className="text-lg font-semibold text-white">Create New Crew</h3>
            </div>

            <div>
              <label htmlFor="name" className="block text-xs font-medium text-white/40 uppercase tracking-wider mb-2">
                Crew Name *
              </label>
              <input
                id="name"
                name="name"
                type="text"
                required
                maxLength={100}
                placeholder="Enter crew name"
                className="w-full h-12 px-4 rounded-lg bg-[#0a0a0a] text-white border border-[#1a1a1a] focus:outline-none focus:ring-2 focus:ring-accent/50 focus:border-accent/50 placeholder:text-white/30 transition-all"
              />
            </div>

            <div>
              <label htmlFor="description" className="block text-xs font-medium text-white/40 uppercase tracking-wider mb-2">
                Description
              </label>
              <textarea
                id="description"
                name="description"
                rows={3}
                maxLength={500}
                placeholder="Describe your crew's mission..."
                className="w-full px-4 py-3 rounded-lg bg-[#0a0a0a] text-white border border-[#1a1a1a] focus:outline-none focus:ring-2 focus:ring-accent/50 focus:border-accent/50 placeholder:text-white/30 transition-all resize-none"
              />
            </div>

            <div className="flex items-center gap-3 p-4 rounded-lg bg-[#0a0a0a] border border-[#1a1a1a]">
              <input
                id="openToMembers"
                type="checkbox"
                checked={openToMembers}
                onChange={(e) => setOpenToMembers(e.target.checked)}
                className="w-5 h-5 rounded border-[#2a2a2a] bg-[#0a0a0a] text-accent focus:ring-accent/50"
              />
              <label htmlFor="openToMembers" className="text-sm text-white/70">
                Allow people to request to join
              </label>
            </div>

            {error && (
              <div className="p-3 rounded-lg bg-[#ff4a4a]/10 border border-[#ff4a4a]/30">
                <p className="text-sm text-[#ff4a4a]">{error}</p>
              </div>
            )}

            <div className="flex gap-3 pt-2">
              <Button 
                type="submit" 
                disabled={isCreating}
                className="flex-1 bg-white text-black font-medium hover:bg-white/90"
              >
                {isCreating ? "Creating..." : "Create Crew"}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={onCancel}
                className="bg-[#0a0a0a] border-[#1a1a1a] text-white hover:bg-[#1a1a1a]"
              >
                Cancel
              </Button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════
// EMPTY STATE
// ═══════════════════════════════════════════════════════════════════════
function EmptyState({ type }: { type: "search" | "noCrews" }) {
  return (
    <div className="relative rounded-xl overflow-hidden bg-gradient-to-br from-[#0d0d0d] via-[#111111] to-[#0a0a0a] border border-[#1a1a1a] shadow-[0_4px_20px_rgba(0,0,0,0.3)] p-12">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-gradient-to-br from-accent/5 to-transparent rounded-full blur-3xl" />
      </div>

      <div className="relative flex flex-col items-center text-center">
        <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-accent/10 to-accent/5 border border-accent/20 flex items-center justify-center mb-6">
          {type === "search" ? (
            <Search className="w-10 h-10 text-accent/60" />
          ) : (
            <Users className="w-10 h-10 text-accent/60" />
          )}
        </div>
        <h3 className="text-xl font-semibold text-white mb-2">
          {type === "search" ? "No crews found" : "No Crews Available"}
        </h3>
        <p className="text-white/40 max-w-md">
          {type === "search" 
            ? "Try searching for a different name or adjust your filters."
            : "Be the first to create a crew and start building your trading team!"
          }
        </p>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════
// SEARCH RESULTS SECTION
// ═══════════════════════════════════════════════════════════════════════
function SearchResultsSection({
  results,
  onRequestJoin,
}: {
  results: SearchResult[];
  onRequestJoin: (crewId: string) => void;
}) {
  if (results.length === 0) {
    return <EmptyState type="search" />;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-white">Search Results</h3>
        <span className="text-sm text-white/40">{results.length} crew{results.length !== 1 ? "s" : ""} found</span>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {results.map((result) => {
          // Convert SearchResult to Crew-like object for CrewCard
          const crewLike: Crew = {
            id: result.id,
            name: result.name,
            description: result.description,
            openToMembers: result.openToMembers,
            createdByUserId: result.creator.id,
            createdBy: {
              id: result.creator.id,
              name: null,
              email: null,
              image: null,
              username: result.creator.username,
              xHandle: result.creator.xHandle,
            },
            members: Array(result.memberCount).fill({ id: "", joinedAt: "", user: {} }),
            createdAt: result.createdAt,
            updatedAt: result.createdAt,
          };

          return (
            <CrewCard
              key={result.id}
              crew={crewLike}
              onRequestJoin={onRequestJoin}
              hasPendingRequest={result.hasPendingRequest}
            />
          );
        })}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════════
export default function CrewsClient({ userCrew, otherCrews, userId }: CrewsClientProps) {
  const [crews] = useState<Crew[]>(otherCrews);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [sortBy, setSortBy] = useState("top-ranked");
  const [rankingMetric, setRankingMetric] = useState("pnl");
  const [timeframe, setTimeframe] = useState("all");
  const [openToMembers, setOpenToMembers] = useState(true);
  const router = useRouter();

  const canCreateCrew = !userCrew;

  const handleCreateCrew = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsCreating(true);
    setError(null);

    const formData = new FormData(e.currentTarget);
    const name = formData.get("name") as string;
    const description = formData.get("description") as string;

    try {
      const response = await fetch("/api/crews", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ name, description, openToMembers }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to create crew");
      }

      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setIsCreating(false);
    }
  };

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) {
      setShowSearchResults(false);
      return;
    }

    setIsSearching(true);
    try {
      const response = await fetch(
        `/api/crews/search?query=${encodeURIComponent(searchQuery)}&sort=${sortBy}`
      );
      if (response.ok) {
        const results = await response.json();
        setSearchResults(results);
        setShowSearchResults(true);
      }
    } catch (err) {
      console.error("Error searching crews:", err);
    } finally {
      setIsSearching(false);
    }
  };

  const handleRequestJoin = async (crewId: string) => {
    try {
      const response = await fetch(`/api/crews/${crewId}/request-join`, {
        method: "POST",
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to request join");
      }

      alert("Join request sent! The crew creator will review your request.");
      router.refresh();
    } catch (err) {
      alert(err instanceof Error ? err.message : "An error occurred");
    }
  };

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <PageHeader />

      {/* Your Crew Section */}
      {userCrew && <YourCrewCard crew={userCrew} userId={userId} />}

      {/* Create Crew Section (if not in a crew) */}
      {canCreateCrew && (
        <CreateCrewSection
          showForm={showCreateForm}
          setShowForm={setShowCreateForm}
          onSubmit={handleCreateCrew}
          isCreating={isCreating}
          error={error}
          openToMembers={openToMembers}
          setOpenToMembers={setOpenToMembers}
          onCancel={() => {
            setShowCreateForm(false);
            setError(null);
          }}
        />
      )}

      {/* Search & Filter Bar */}
      <SearchFilterBar
        searchQuery={searchQuery}
        setSearchQuery={(v) => {
          setSearchQuery(v);
          if (!v.trim()) setShowSearchResults(false);
        }}
        sortBy={sortBy}
        setSortBy={setSortBy}
        rankingMetric={rankingMetric}
        setRankingMetric={setRankingMetric}
        timeframe={timeframe}
        setTimeframe={setTimeframe}
        onSearch={handleSearch}
        isSearching={isSearching}
      />

      {/* Search Results */}
      {showSearchResults && (
        <SearchResultsSection
          results={searchResults}
          onRequestJoin={handleRequestJoin}
        />
      )}

      {/* Browse Crews Grid */}
      {!showSearchResults && crews.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-white">
              {userCrew ? "Other Crews" : "Browse Crews"}
            </h3>
            <span className="text-sm text-white/40">{crews.length} crew{crews.length !== 1 ? "s" : ""}</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {crews.map((crew) => (
              <CrewCard
                key={crew.id}
                crew={crew}
                onRequestJoin={handleRequestJoin}
                hasPendingRequest={crew.joinRequests && crew.joinRequests.length > 0}
              />
            ))}
          </div>
        </div>
      )}

      {/* Empty State */}
      {!showSearchResults && !userCrew && crews.length === 0 && (
        <EmptyState type="noCrews" />
      )}
    </div>
  );
}
