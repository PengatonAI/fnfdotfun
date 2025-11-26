"use client";

import { cn } from "@/lib/utils";

interface PnLCardStatsProps {
  stats: any;
  settings: {
    showVolume: boolean;
    showWinRate: boolean;
    showTotalTrades: boolean;
    showPnl: boolean;
  };
  accentColor: string;
  font: string;
}

// Format large numbers
function formatNumber(value: number): string {
  return new Intl.NumberFormat("en-US", {
    maximumFractionDigits: 0,
  }).format(value);
}

// Format currency
function formatCurrency(value: number): string {
  const absValue = Math.abs(value);
  if (absValue >= 1000000) {
    return `${(value / 1000000).toFixed(2)}M`;
  }
  if (absValue >= 1000) {
    return `${(value / 1000).toFixed(1)}K`;
  }
  return value.toFixed(2);
}

export default function PnLCardStats({
  stats,
  settings,
  accentColor,
  font,
}: PnLCardStatsProps) {
  const pnl = stats?.pnl;
  const totalPnl = pnl?.totalPnl ?? 0;
  const isPositive = totalPnl >= 0;

  return (
    <div className="flex flex-col gap-4" style={{ fontFamily: font }}>
      {/* Main PnL Display */}
      {settings.showPnl && (
        <div className="text-center">
          <div className="text-xs uppercase tracking-wider text-neutral-500 mb-1">
            Total P&L
          </div>
          <div
            className={cn(
              "text-4xl font-bold tracking-tight",
              isPositive ? "drop-shadow-[0_0_10px_rgba(34,197,94,0.5)]" : "drop-shadow-[0_0_10px_rgba(239,68,68,0.5)]"
            )}
            style={{ color: isPositive ? "#22C55E" : "#EF4444" }}
          >
            {isPositive ? "+" : ""}${formatCurrency(totalPnl)}
          </div>
        </div>
      )}

      {/* Stats Grid */}
      <div className="grid grid-cols-3 gap-3">
        {settings.showVolume && (
          <div className="text-center p-2 rounded-lg bg-white/5">
            <div className="text-[10px] uppercase tracking-wider text-neutral-500">
              Volume
            </div>
            <div
              className="text-lg font-semibold"
              style={{ color: accentColor }}
            >
              ${formatCurrency(pnl?.volume ?? 0)}
            </div>
          </div>
        )}

        {settings.showWinRate && (
          <div className="text-center p-2 rounded-lg bg-white/5">
            <div className="text-[10px] uppercase tracking-wider text-neutral-500">
              Win Rate
            </div>
            <div
              className="text-lg font-semibold"
              style={{ color: accentColor }}
            >
              {((pnl?.winRate ?? 0) * 100).toFixed(1)}%
            </div>
          </div>
        )}

        {settings.showTotalTrades && (
          <div className="text-center p-2 rounded-lg bg-white/5">
            <div className="text-[10px] uppercase tracking-wider text-neutral-500">
              Trades
            </div>
            <div
              className="text-lg font-semibold"
              style={{ color: accentColor }}
            >
              {formatNumber(pnl?.totalTrades ?? 0)}
            </div>
          </div>
        )}
      </div>

      {/* Realized vs Unrealized */}
      <div className="flex justify-center gap-6 text-xs">
        <div className="text-center">
          <span className="text-neutral-500">Realized: </span>
          <span className={pnl?.realizedPnl >= 0 ? "text-green-400" : "text-red-400"}>
            {pnl?.realizedPnl >= 0 ? "+" : ""}${formatCurrency(pnl?.realizedPnl ?? 0)}
          </span>
        </div>
        <div className="text-center">
          <span className="text-neutral-500">Unrealized: </span>
          <span className={pnl?.unrealizedPnl >= 0 ? "text-green-400" : "text-red-400"}>
            {pnl?.unrealizedPnl >= 0 ? "+" : ""}${formatCurrency(pnl?.unrealizedPnl ?? 0)}
          </span>
        </div>
      </div>
    </div>
  );
}
