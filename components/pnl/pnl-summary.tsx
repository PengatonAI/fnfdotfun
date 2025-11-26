"use client";

import useSWR from "swr";
import { fetcher } from "@/lib/swr-fetcher";

export function PnlSummary() {
  const { data, error, isLoading } = useSWR("/api/profile/pnl", fetcher, {
    refreshInterval: 15000, // 15s live updates
  });

  if (isLoading) {
    return <div className="text-foreground">Loading PnL...</div>;
  }

  if (error || !data) {
    return <div className="text-[#ff4a4a]">Failed to load PnL.</div>;
  }

  const {
    totalPnL,
    realizedPnL,
    unrealizedPnL,
    metrics: {
      winRate,
      volume,
      avgWin,
      avgLoss,
      totalTrades,
    },
  } = data;

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      <div className="p-6 bg-card rounded-xl border border-border h-full flex flex-col">
        <div className="text-muted-foreground text-sm mb-2">Total PnL</div>
        <div className={`text-xl font-bold ${totalPnL >= 0 ? "text-[#00d57a]" : "text-[#ff4a4a]"} flex-1 flex items-end`}>
          ${totalPnL.toFixed(2)}
        </div>
      </div>

      <div className="p-6 bg-card rounded-xl border border-border h-full flex flex-col">
        <div className="text-muted-foreground text-sm mb-2">Realized PnL</div>
        <div className={`${realizedPnL >= 0 ? "text-[#00d57a]" : "text-[#ff4a4a]"} text-xl font-bold flex-1 flex items-end`}>
          ${realizedPnL.toFixed(2)}
        </div>
      </div>

      <div className="p-6 bg-card rounded-xl border border-border h-full flex flex-col">
        <div className="text-muted-foreground text-sm mb-2">Unrealized PnL</div>
        <div className={`${unrealizedPnL >= 0 ? "text-[#00d57a]" : "text-[#ff4a4a]"} text-xl font-bold flex-1 flex items-end`}>
          ${unrealizedPnL.toFixed(2)}
        </div>
      </div>

      <div className="p-6 bg-card rounded-xl border border-border h-full flex flex-col">
        <div className="text-muted-foreground text-sm mb-2">Win Rate</div>
        <div className="text-xl font-bold text-foreground flex-1 flex items-end">
          {(winRate * 100).toFixed(1)}%
        </div>
      </div>

      <div className="p-6 bg-card rounded-xl border border-border h-full flex flex-col">
        <div className="text-muted-foreground text-sm mb-2">Volume</div>
        <div className="text-xl font-bold text-foreground flex-1 flex items-end">
          ${volume.toFixed(2)}
        </div>
      </div>

      <div className="p-6 bg-card rounded-xl border border-border h-full flex flex-col">
        <div className="text-muted-foreground text-sm mb-2">Avg Win</div>
        <div className="text-xl font-bold text-[#00d57a] flex-1 flex items-end">
          ${avgWin.toFixed(2)}
        </div>
      </div>

      <div className="p-6 bg-card rounded-xl border border-border h-full flex flex-col">
        <div className="text-muted-foreground text-sm mb-2">Avg Loss</div>
        <div className="text-xl font-bold text-[#ff4a4a] flex-1 flex items-end">
          ${avgLoss.toFixed(2)}
        </div>
      </div>
    </div>
  );
}

