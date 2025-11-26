"use client";

import { useState, useMemo } from "react";
import useSWR from "swr";
import { fetcher } from "@/lib/swr-fetcher";
import CrewLeaderboardTable from "./crew-leaderboard-table";
import { LeaderboardHero, LeaderboardHeroEmpty } from "../components/leaderboard-hero";
import { Timeframe } from "@/lib/leaderboard/types";
import { CrewLeaderboardMetric, CrewLeaderboardEntry } from "@/lib/leaderboard/crew-engine";
import { TrendingUp, BarChart3, Trophy, Percent, Clock, Link as LinkIcon } from "lucide-react";

interface CrewInfo {
  id: string;
  name: string;
  avatarUrl: string | null;
  memberCount: number;
}

interface CrewLeaderboardClientProps {
  initialData: {
    entries: CrewLeaderboardEntry[];
    total: number;
    limit: number;
    offset: number;
  } | null;
  crewInfo: CrewInfo | null;
}

export default function CrewLeaderboardClient({
  initialData,
  crewInfo,
}: CrewLeaderboardClientProps) {
  const [metric, setMetric] = useState<CrewLeaderboardMetric>("realizedPnl");
  const [timeframe, setTimeframe] = useState<Timeframe>("all");
  const [chain, setChain] = useState<string>("");

  // Build query parameters
  const queryParams = useMemo(() => {
    const params = new URLSearchParams();
    params.set("metric", metric);
    params.set("timeframe", timeframe);
    params.set("limit", "50");
    if (chain) {
      params.set("chain", chain);
    }
    return params.toString();
  }, [metric, timeframe, chain]);

  const apiUrl = `/api/leaderboards/crews?${queryParams}`;

  // Fetch leaderboard data with SWR
  const { data, error, isLoading } = useSWR(apiUrl, fetcher, {
    refreshInterval: 15000, // 15s live updates
    fallbackData: initialData,
  });

  const entries = data?.entries || [];
  const total = data?.total || 0;

  // Find current user's crew entry and stats from the leaderboard data
  const currentCrewEntry = useMemo(() => {
    if (!crewInfo) return null;
    const index = entries.findIndex((e: CrewLeaderboardEntry) => e.crewId === crewInfo.id);
    if (index === -1) return null;
    return {
      entry: entries[index] as CrewLeaderboardEntry,
      rank: index + 1,
    };
  }, [entries, crewInfo]);

  const metricOptions: { value: CrewLeaderboardMetric; label: string; icon: React.ReactNode }[] = [
    { value: "realizedPnl", label: "Realized PnL", icon: <TrendingUp className="w-4 h-4" /> },
    { value: "totalPnl", label: "Total PnL", icon: <BarChart3 className="w-4 h-4" /> },
    { value: "volume", label: "Volume", icon: <Trophy className="w-4 h-4" /> },
    { value: "avgWinRate", label: "Avg Win Rate", icon: <Percent className="w-4 h-4" /> },
  ];

  const timeframeOptions: { value: Timeframe; label: string }[] = [
    { value: "all", label: "All Time" },
    { value: "30d", label: "30 Days" },
    { value: "7d", label: "7 Days" },
  ];

  // Determine banner data: prioritize leaderboard entry data when available
  const bannerData = currentCrewEntry
    ? {
        // Crew IS ranked - use real leaderboard data
        avatar: crewInfo?.avatarUrl || null,
        title: currentCrewEntry.entry.crewName || crewInfo?.name || "Unknown Crew",
        subtitle: `${currentCrewEntry.entry.memberCount} member${currentCrewEntry.entry.memberCount !== 1 ? 's' : ''}`,
        rank: currentCrewEntry.rank,
        pnl: currentCrewEntry.entry.metricValue,
        winRate: currentCrewEntry.entry.avgWinRate,
        trades: currentCrewEntry.entry.totalTrades,
        volume: currentCrewEntry.entry.totalVolume,
      }
    : crewInfo
    ? {
        // Crew exists but NOT ranked yet - show identity with zeros
        avatar: crewInfo.avatarUrl,
        title: crewInfo.name,
        subtitle: `${crewInfo.memberCount} member${crewInfo.memberCount !== 1 ? 's' : ''}`,
        rank: null,
        pnl: 0,
        winRate: 0,
        trades: 0,
        volume: 0,
      }
    : null;

  return (
    <div className="space-y-6">
      {/* ═══════════════════════════════════════════════════════════════════════
          HERO BANNER - Shows current user's crew real stats from leaderboard data
      ═══════════════════════════════════════════════════════════════════════ */}
      {bannerData ? (
        <LeaderboardHero
          type="crew"
          avatar={bannerData.avatar}
          title={bannerData.title}
          subtitle={bannerData.subtitle}
          rank={bannerData.rank}
          totalRanked={total}
          pnl={bannerData.pnl}
          winRate={bannerData.winRate}
          trades={bannerData.trades}
          volume={bannerData.volume}
          isLoading={isLoading && !data}
        />
      ) : (
        <LeaderboardHeroEmpty type="crew" />
      )}

      {/* ═══════════════════════════════════════════════════════════════════════
          PREMIUM FILTER CONTROLS
      ═══════════════════════════════════════════════════════════════════════ */}
      <div className="relative rounded-xl bg-gradient-to-br from-[#0d0d0d] via-[#111111] to-[#0a0a0a] border border-[#1a1a1a] p-5 shadow-[0_4px_20px_rgba(0,0,0,0.3)]">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
          {/* Metric Selection */}
          <div className="flex flex-col gap-3">
            <label className="text-xs font-medium text-white/40 uppercase tracking-wider">Ranking By</label>
            <div className="flex flex-wrap gap-2">
              {metricOptions.map((m) => (
                <button
                  key={m.value}
                  onClick={() => setMetric(m.value)}
                  className={`relative flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 ${
                    metric === m.value
                      ? "bg-[#0a0a0a] text-white border border-white/20 shadow-[0_0_15px_rgba(168,85,247,0.2)] tricolor-hover-border"
                      : "bg-[#0a0a0a]/50 text-white/50 border border-[#1a1a1a] hover:text-white hover:bg-[#0a0a0a] hover:border-white/10"
                  }`}
                >
                  {m.icon}
                  {m.label}
                </button>
              ))}
            </div>
          </div>

          {/* Timeframe + Chain Controls */}
          <div className="flex flex-wrap items-end gap-6">
            {/* Timeframe Selection */}
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

            {/* Chain Selection */}
            <div className="flex flex-col gap-3">
              <label className="text-xs font-medium text-white/40 uppercase tracking-wider flex items-center gap-2">
                <LinkIcon className="w-3 h-3" />
                Chain
              </label>
              <select
                value={chain}
                onChange={(e) => setChain(e.target.value)}
                className="px-4 py-2.5 rounded-lg text-sm font-medium bg-[#0a0a0a] text-white border border-[#1a1a1a] hover:border-white/10 focus:outline-none focus:ring-2 focus:ring-accent/50 transition-all cursor-pointer"
              >
                <option value="">All Chains</option>
                <option value="evm">EVM</option>
                <option value="solana" disabled>Solana (Coming Soon)</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Loading State */}
      {isLoading && !data && (
        <div className="relative rounded-xl bg-gradient-to-br from-[#0d0d0d] via-[#111111] to-[#0a0a0a] border border-[#1a1a1a] p-12 text-center">
          <div className="flex flex-col items-center gap-4">
            <div className="w-12 h-12 rounded-full border-2 border-accent/30 border-t-accent animate-spin" />
            <p className="text-white/50">Loading crew leaderboard...</p>
          </div>
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="relative rounded-xl bg-gradient-to-br from-[#0d0d0d] via-[#111111] to-[#0a0a0a] border border-[#ff4a4a]/30 p-12 text-center">
          <div className="flex flex-col items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-[#ff4a4a]/10 flex items-center justify-center">
              <span className="text-2xl">⚠️</span>
            </div>
            <p className="text-[#ff4a4a]">Failed to load leaderboard. Please try again.</p>
          </div>
        </div>
      )}

      {/* Leaderboard Content */}
      {data && !error && (
        <>
          {/* Results Count */}
          <div className="flex items-center justify-between">
            <p className="text-sm text-white/40">
              Showing <span className="text-white font-medium">{entries.length}</span> of{" "}
              <span className="text-white font-medium">{total}</span> crews
            </p>
          </div>

          {/* Leaderboard Table */}
          <CrewLeaderboardTable entries={entries} metric={metric} currentCrewId={crewInfo?.id || null} />
        </>
      )}
    </div>
  );
}
