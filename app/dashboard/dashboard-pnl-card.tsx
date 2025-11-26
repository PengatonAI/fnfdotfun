"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import PnLCardPreview from "@/components/pnl-card/pnl-card-preview";
import { BarChart3, ChevronRight } from "lucide-react";

interface PnLCardData {
  cardId: string;
  settings: {
    theme: string;
    backgroundColor: string;
    accentColor: string;
    showPnl?: boolean;
    showVolume?: boolean;
    showWinRate?: boolean;
    showTotalTrades?: boolean;
    frame?: string;
    badges?: string[];
    font?: string;
  };
  stats: {
    pnl?: {
      totalPnl?: number;
      realizedPnl?: number;
      unrealizedPnl?: number;
      winRate?: number;
      volume?: number;
      totalTrades?: number;
    };
  };
  range: string;
}

interface DashboardPnLCardProps {
  pnlCardData: PnLCardData | null;
}

export function DashboardPnLCard({ pnlCardData }: DashboardPnLCardProps) {
  const linkHref = "/pnl-card";

  // Placeholder when no card exists
  if (!pnlCardData) {
    return (
      <Link
        href={linkHref}
        className="relative rounded-2xl overflow-hidden bg-gradient-to-br from-[#0d0d0d] via-[#111111] to-[#0a0a0a] border border-[#1a1a1a] shadow-[0_4px_20px_rgba(0,0,0,0.3)] h-full flex flex-col transition-all duration-300 hover:border-[#2a2a2a] hover:shadow-[0_8px_40px_rgba(0,0,0,0.4)] group"
      >
        {/* Decorative glow */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-24 -right-24 w-64 h-64 bg-gradient-to-br from-accent/10 to-transparent rounded-full blur-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
        </div>

        <div className="relative p-6 flex flex-col h-full">
          {/* Header */}
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-white">Your PnL Card</h2>
            <div className="flex gap-2">
              <span className="px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider rounded-full bg-white/5 text-white/40 border border-white/10">
                FNFDOTFUN
              </span>
              <span className="px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider rounded-full bg-white/5 text-white/40 border border-white/10">
                ALL TIME
              </span>
            </div>
          </div>

          {/* Card Container */}
          <div className="flex-1 rounded-xl bg-[#0a0a0a] border border-[#1a1a1a] p-6 flex flex-col">
            {/* Branding */}
            <div className="mb-4">
              <span className="text-sm font-bold tracking-widest text-accent">FNF.FUN</span>
            </div>

            {/* Placeholder content */}
            <div className="flex-1 flex flex-col items-center justify-center py-4">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-accent/20 to-accent/5 border border-accent/20 flex items-center justify-center mb-4 group-hover:from-accent/30 group-hover:to-accent/10 transition-colors">
                <BarChart3 className="w-8 h-8 text-accent" />
              </div>
              <p className="text-sm text-white/40 text-center mb-4 max-w-[280px]">
                Create a shareable card showcasing your trading performance
              </p>
              <Button
                size="sm"
                className="bg-accent hover:bg-accent/90 text-white px-6"
              >
                Create PnL Card
              </Button>
            </div>
          </div>
        </div>
      </Link>
    );
  }

  // Transform pnlCardData to match PnLCardPreview props
  const previewSettings = {
    theme: pnlCardData.settings.theme || "dark",
    backgroundColor: pnlCardData.settings.backgroundColor || "#111111",
    accentColor: pnlCardData.settings.accentColor || "#A855F7",
    showAvatar: true,
    showUsername: true,
    showPnl: pnlCardData.settings.showPnl ?? true,
    showVolume: pnlCardData.settings.showVolume ?? true,
    showWinRate: pnlCardData.settings.showWinRate ?? true,
    showTotalTrades: pnlCardData.settings.showTotalTrades ?? true,
    font: pnlCardData.settings.font || "Inter",
    frame: pnlCardData.settings.frame || "none",
    badges: pnlCardData.settings.badges || [],
  };

  const previewStats = {
    ...pnlCardData.stats,
    range: pnlCardData.range,
  };

  return (
    <Link
      href={linkHref}
      className="relative rounded-2xl overflow-hidden bg-gradient-to-br from-[#0d0d0d] via-[#111111] to-[#0a0a0a] border border-[#1a1a1a] shadow-[0_4px_20px_rgba(0,0,0,0.3)] transition-all duration-300 hover:border-[#2a2a2a] hover:shadow-[0_8px_40px_rgba(0,0,0,0.4)] group cursor-pointer"
    >
      {/* Decorative glow */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-24 -right-24 w-64 h-64 bg-gradient-to-br from-accent/10 to-transparent rounded-full blur-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
        <div className="absolute -bottom-24 -left-24 w-48 h-48 bg-gradient-to-tr from-[#00d57a]/5 to-transparent rounded-full blur-3xl" />
      </div>

      <div className="relative p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-white">Your PnL Card</h2>
          <span className="flex items-center gap-1 text-xs text-white/40 group-hover:text-white/60 transition-colors">
            Click to customize
            <ChevronRight className="w-3.5 h-3.5" />
          </span>
        </div>

        {/* PnL Card Preview - using the actual component */}
        <div className="overflow-visible">
          <PnLCardPreview
            settings={previewSettings}
            stats={previewStats}
            loading={false}
          />
        </div>
      </div>
    </Link>
  );
}
