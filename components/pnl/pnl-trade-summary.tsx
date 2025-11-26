"use client";

import useSWR from "swr";
import { fetcher } from "@/lib/swr-fetcher";

export function PnlTradeSummary() {
  const { data, error, isLoading } = useSWR("/api/profile/pnl", fetcher, {
    refreshInterval: 15000, // 15s live updates
  });

  if (isLoading) {
    return <div className="text-foreground mb-6">Loading PnL...</div>;
  }

  if (error || !data) {
    return <div className="text-[#ff4a4a] mb-6">Failed to load PnL.</div>;
  }

  const { realizedPnL, metrics } = data;
  const { totalTrades, volume, winRate, avgWin, avgLoss } = metrics;

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
      <div className="p-4 bg-card rounded-lg border border-border">
        <div className="text-muted-foreground text-sm">Total Trades</div>
        <div className="text-xl font-bold text-foreground">
          {totalTrades}
        </div>
      </div>

      <div className="p-4 bg-card rounded-lg border border-border">
        <div className="text-muted-foreground text-sm">Volume</div>
        <div className="text-xl font-bold text-foreground">
          ${volume.toFixed(2)}
        </div>
      </div>

      <div className="p-4 bg-card rounded-lg border border-border">
        <div className="text-muted-foreground text-sm">Realized PnL</div>
        <div className={`text-xl font-bold ${realizedPnL >= 0 ? "text-[#00d57a]" : "text-[#ff4a4a]"}`}>
          ${realizedPnL.toFixed(2)}
        </div>
      </div>

      <div className="p-4 bg-card rounded-lg border border-border">
        <div className="text-muted-foreground text-sm">Win Rate</div>
        <div className="text-xl font-bold text-foreground">
          {(winRate * 100).toFixed(1)}%
        </div>
      </div>

      <div className="p-4 bg-card rounded-lg border border-border">
        <div className="text-muted-foreground text-sm">Avg Win</div>
        <div className="text-xl font-bold text-[#00d57a]">
          ${avgWin.toFixed(2)}
        </div>
      </div>

      <div className="p-4 bg-card rounded-lg border border-border">
        <div className="text-muted-foreground text-sm">Avg Loss</div>
        <div className="text-xl font-bold text-[#ff4a4a]">
          ${avgLoss.toFixed(2)}
        </div>
      </div>
    </div>
  );
}

