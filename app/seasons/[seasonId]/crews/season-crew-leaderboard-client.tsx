"use client";

import { useState, useMemo } from "react";
import useSWR from "swr";
import { fetcher } from "@/lib/swr-fetcher";
import SeasonCrewLeaderboardTable from "./season-crew-leaderboard-table";
import { LeaderboardMetric } from "@/lib/leaderboard/types";
import { TrendingUp, BarChart3, Percent, Trophy, Link as LinkIcon } from "lucide-react";

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

interface SeasonCrewLeaderboardClientProps {
  season: {
    id: string;
    name: string;
    startAt: string;
    endAt: string;
  };
  initialData: {
    entries: SeasonCrewLeaderboardEntry[];
    total: number;
    limit: number;
    offset: number;
  } | null;
}

export default function SeasonCrewLeaderboardClient({
  season,
  initialData,
}: SeasonCrewLeaderboardClientProps) {
  const [metric, setMetric] = useState<LeaderboardMetric>("realizedPnl");
  const [chain, setChain] = useState<string>("");

  // Build query parameters
  const queryParams = useMemo(() => {
    const params = new URLSearchParams();
    params.set("metric", metric);
    params.set("limit", "50");
    if (chain) {
      params.set("chain", chain);
    }
    return params.toString();
  }, [metric, chain]);

  const apiUrl = `/api/leaderboards/seasons/${season.id}/crews?${queryParams}`;

  // Fetch leaderboard data with SWR
  const { data, error, isLoading } = useSWR(apiUrl, fetcher, {
    refreshInterval: 15000, // 15s live updates
    fallbackData: initialData,
  });

  const entries = data?.entries || [];
  const total = data?.total || 0;

  const metricOptions: { value: LeaderboardMetric; label: string; icon: React.ReactNode }[] = [
    { value: "realizedPnl", label: "Realized PnL", icon: <TrendingUp className="w-4 h-4" /> },
    { value: "totalPnl", label: "Total PnL", icon: <BarChart3 className="w-4 h-4" /> },
    { value: "volume", label: "Volume", icon: <Trophy className="w-4 h-4" /> },
    { value: "winRate", label: "Win Rate", icon: <Percent className="w-4 h-4" /> },
  ];

  return (
    <div className="space-y-6">
      {/* ═══════════════════════════════════════════════════════════════
          PREMIUM FILTER CONTROLS
      ═══════════════════════════════════════════════════════════════ */}
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
          <SeasonCrewLeaderboardTable entries={entries} metric={metric} />
        </>
      )}
    </div>
  );
}
