"use client";

import Link from "next/link";
import Image from "next/image";
import { getUserInitial } from "@/lib/user-utils";
import { Button } from "@/components/ui/button";
import { Trophy, Medal, ChevronRight } from "lucide-react";

interface LeaderboardEntry {
  userId: string;
  username: string | null;
  xHandle: string | null;
  image: string | null;
  realizedPnl: number;
}

interface LeaderboardSnapshotCardProps {
  currentUserId: string;
  entries: LeaderboardEntry[];
  userRank: number | null;
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
  return `${prefix}$${absValue.toFixed(2)}`;
}

export function LeaderboardSnapshotCard({
  currentUserId,
  entries,
  userRank,
}: LeaderboardSnapshotCardProps) {
  // Determine which entries to show based on user's rank
  const getDisplayEntries = (): { entry: LeaderboardEntry; rank: number }[] => {
    if (!userRank || entries.length === 0) {
      return [];
    }

    const displayEntries: { entry: LeaderboardEntry; rank: number }[] = [];

    // If user is rank 1, show rank 1 (you) and rank 2
    if (userRank === 1) {
      if (entries[0]) {
        displayEntries.push({ entry: entries[0], rank: 1 });
      }
      if (entries[1]) {
        displayEntries.push({ entry: entries[1], rank: 2 });
      }
    }
    // If user is last place, show user and one above
    else if (userRank === entries.length) {
      if (entries[userRank - 2]) {
        displayEntries.push({ entry: entries[userRank - 2], rank: userRank - 1 });
      }
      if (entries[userRank - 1]) {
        displayEntries.push({ entry: entries[userRank - 1], rank: userRank });
      }
    }
    // Normal case: show rank-1, rank (you), rank+1
    else {
      if (entries[userRank - 2]) {
        displayEntries.push({ entry: entries[userRank - 2], rank: userRank - 1 });
      }
      if (entries[userRank - 1]) {
        displayEntries.push({ entry: entries[userRank - 1], rank: userRank });
      }
      if (entries[userRank]) {
        displayEntries.push({ entry: entries[userRank], rank: userRank + 1 });
      }
    }

    return displayEntries;
  };

  const displayEntries = getDisplayEntries();

  return (
    <div className="relative rounded-2xl overflow-hidden bg-gradient-to-br from-[#0d0d0d] via-[#111111] to-[#0a0a0a] border border-[#1a1a1a] shadow-[0_4px_20px_rgba(0,0,0,0.3)] h-full flex flex-col">
      {/* Decorative glow */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-24 -right-24 w-64 h-64 bg-gradient-to-br from-accent/5 to-transparent rounded-full blur-3xl" />
        <div className="absolute -bottom-24 -left-24 w-48 h-48 bg-gradient-to-tr from-yellow-500/5 to-transparent rounded-full blur-3xl" />
      </div>

      <div className="relative p-6 flex flex-col h-full">
        {/* Header */}
        <div className="flex items-center gap-2 mb-4">
          <Trophy className="w-5 h-5 text-yellow-500" />
          <h2 className="text-lg font-semibold text-white">Leaderboard</h2>
        </div>

        {/* User's current rank display */}
        {userRank && (
          <div className="mb-4 pb-4 border-b border-[#1a1a1a]">
            <div className="flex items-center gap-2 text-sm text-white/40">
              <Medal className="w-4 h-4" />
              <span>Your current rank</span>
            </div>
            <p className="text-2xl font-bold text-white mt-1">#{userRank}</p>
          </div>
        )}

        {/* Leaderboard Rows */}
        <div className="flex-1 flex flex-col gap-2">
          {displayEntries.length > 0 ? (
            displayEntries.map(({ entry, rank }) => {
              const isCurrentUser = entry.userId === currentUserId;
              const displayName = entry.username || "Unknown";
              const initial = getUserInitial({
                username: entry.username,
                xHandle: entry.xHandle,
              });

              return (
                <div
                  key={entry.userId}
                  className={`flex items-center gap-3 p-3 rounded-xl transition-all ${
                    isCurrentUser
                      ? "bg-accent/10 border border-accent/30 shadow-[0_0_15px_rgba(168,85,247,0.15)]"
                      : "bg-[#0a0a0a]/50 border border-[#1a1a1a]"
                  }`}
                >
                  {/* Rank */}
                  <div className="w-8 text-center">
                    <span
                      className={`text-sm font-bold ${
                        isCurrentUser ? "text-accent" : "text-white/40"
                      }`}
                    >
                      #{rank}
                    </span>
                  </div>

                  {/* Avatar */}
                  <div className="relative h-8 w-8 rounded-full overflow-hidden bg-[#1a1a1a] flex items-center justify-center flex-shrink-0 border border-[#2a2a2a]">
                    {entry.image ? (
                      <Image
                        src={entry.image}
                        alt={displayName}
                        width={32}
                        height={32}
                        className="object-cover"
                      />
                    ) : (
                      <span className="text-xs font-medium text-white/50">
                        {initial}
                      </span>
                    )}
                  </div>

                  {/* Username */}
                  <div className="flex-1 min-w-0">
                    <span
                      className={`text-sm truncate block ${
                        isCurrentUser ? "font-bold text-white" : "text-white"
                      }`}
                    >
                      {displayName}
                      {isCurrentUser && (
                        <span className="text-xs text-accent ml-1.5">(you)</span>
                      )}
                    </span>
                  </div>

                  {/* PnL */}
                  <div className="text-right">
                    <span
                      className={`text-sm font-semibold ${
                        entry.realizedPnl >= 0 ? "text-[#00d57a]" : "text-[#ff4a4a]"
                      }`}
                    >
                      {formatCurrency(entry.realizedPnl)}
                    </span>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="flex-1 flex items-center justify-center rounded-xl bg-[#0a0a0a]/50 border border-[#1a1a1a] p-6">
              <p className="text-white/30 text-sm text-center">
                No leaderboard data available yet. Start trading to appear on the leaderboard!
              </p>
            </div>
          )}
        </div>

        {/* View Full Leaderboard Button */}
        <div className="mt-4 pt-4 border-t border-[#1a1a1a]">
          <Link href="/leaderboard" className="block">
            <div className="relative w-full rounded-lg overflow-hidden">
              <div 
                className="absolute inset-0 rounded-lg p-[1px]"
                style={{
                  background: 'linear-gradient(90deg, #ff4a4a 0%, #ff4a4a 33.33%, #ffffff 33.33%, #ffffff 66.66%, #00d57a 66.66%, #00d57a 100%)',
                }}
              >
                <div className="w-full h-full rounded-[7px] bg-[#0a0a0a]" />
              </div>
              <Button className="relative w-full bg-transparent border-none text-white font-medium hover:bg-white/5 transition-all">
                View Full Leaderboard
                <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            </div>
          </Link>
        </div>
      </div>
    </div>
  );
}
