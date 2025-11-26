"use client";

import PnLCardFrame from "./pnl-card-frame";
import PnLCardStats from "./pnl-card-stats";
import PnLCardBadges from "./pnl-card-badges";

interface PnLCardPreviewProps {
  settings: {
    theme: string;
    backgroundColor: string;
    accentColor: string;
    showAvatar: boolean;
    showUsername: boolean;
    showPnl: boolean;
    showVolume: boolean;
    showWinRate: boolean;
    showTotalTrades: boolean;
    font?: string;
    frame?: string;
    badges?: string[];
  };
  stats: any;
  loading?: boolean;
}

// Theme background mappings
const THEME_BACKGROUNDS: Record<string, string> = {
  dark: "bg-gradient-to-br from-neutral-900 via-neutral-900 to-neutral-800",
  neon: "bg-gradient-to-br from-[#0f0f23] via-[#1a1a2e] to-[#16213e]",
  clean: "bg-gradient-to-br from-zinc-900 via-zinc-900 to-zinc-800",
  cyber: "bg-gradient-to-br from-[#0a0a0f] via-[#0d1117] to-[#161b22]",
};

export default function PnLCardPreview({
  settings,
  stats,
  loading = false,
}: PnLCardPreviewProps) {
  const themeBackground = THEME_BACKGROUNDS[settings.theme] || THEME_BACKGROUNDS.dark;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="text-sm font-medium text-neutral-300">Card Preview</div>
        <div className="text-xs text-neutral-500 font-mono">1200 × 630</div>
      </div>
      
      {/* Card Container with premium styling */}
      <div className="rounded-2xl border border-neutral-800/60 bg-black/40 backdrop-blur-sm shadow-[0_0_50px_rgba(0,0,0,0.7)] p-3">
        {/* Card itself - 16:9 aspect ratio matching OG image dimensions */}
        <div
          className="aspect-[1200/630] rounded-xl overflow-hidden relative"
          style={{ 
            backgroundColor: settings.backgroundColor,
            fontFamily: settings.font || "Inter",
          }}
        >
          {/* Theme gradient overlay */}
          <div className={`absolute inset-0 ${themeBackground} opacity-90`} />
          
          {/* Card content */}
          <div className="relative h-full p-5 flex items-center justify-center">
            {loading ? (
              // Loading skeleton
              <div className="w-full max-w-md space-y-4">
                <div className="h-4 bg-neutral-700/50 rounded-lg animate-pulse w-1/4 mx-auto" />
                <div className="h-14 bg-neutral-700/50 rounded-lg animate-pulse w-2/3 mx-auto" />
                <div className="flex gap-4 justify-center mt-4">
                  <div className="h-16 w-24 bg-neutral-700/50 rounded-xl animate-pulse" />
                  <div className="h-16 w-24 bg-neutral-700/50 rounded-xl animate-pulse" />
                  <div className="h-16 w-24 bg-neutral-700/50 rounded-xl animate-pulse" />
                </div>
                <div className="flex gap-2 justify-center mt-4">
                  <div className="h-7 w-18 bg-neutral-700/50 rounded-full animate-pulse" />
                  <div className="h-7 w-18 bg-neutral-700/50 rounded-full animate-pulse" />
                </div>
              </div>
            ) : stats?.pnl ? (
              // Full card content
              <div className="w-full max-w-md">
                <PnLCardFrame frame={settings.frame || "none"}>
                  {/* Header with branding */}
                  <div className="text-center mb-5">
                    <div 
                      className="text-xs font-bold tracking-[0.25em] uppercase"
                      style={{ color: settings.accentColor }}
                    >
                      FNF.FUN
                    </div>
                    <div className="text-[10px] text-neutral-500 mt-1 tracking-wider uppercase">
                      {stats?.range === "all" ? "All Time" : stats?.range?.toUpperCase()} Performance
                    </div>
                  </div>

                  {/* Stats */}
                  <PnLCardStats
                    stats={stats}
                    settings={{
                      showVolume: settings.showVolume,
                      showWinRate: settings.showWinRate,
                      showTotalTrades: settings.showTotalTrades,
                      showPnl: settings.showPnl,
                    }}
                    accentColor={settings.accentColor}
                    font={settings.font || "Inter"}
                  />

                  {/* Badges */}
                  <PnLCardBadges badges={settings.badges || []} />
                </PnLCardFrame>
              </div>
            ) : (
              // No data state
              <div className="text-center">
                <div className="text-neutral-500 text-sm">
                  {stats?.error ? (
                    <span className="text-red-400">Error loading stats</span>
                  ) : (
                    "No trading data available"
                  )}
                </div>
                <div className="text-neutral-600 text-xs mt-2">
                  Connect wallets and make trades to see your stats
                </div>
              </div>
            )}
          </div>

          {/* Decorative corner accents - original diagonal (top-left & bottom-right) */}
          <div 
            className="absolute top-0 left-0 w-20 h-20 opacity-25"
            style={{
              background: `linear-gradient(135deg, ${settings.accentColor} 0%, transparent 50%)`,
            }}
          />
          <div 
            className="absolute bottom-0 right-0 w-20 h-20 opacity-25"
            style={{
              background: `linear-gradient(-45deg, ${settings.accentColor} 0%, transparent 50%)`,
            }}
          />

          {/* Bottom-left: Logo icon only */}
          <div className="absolute bottom-2 left-3 opacity-75 pointer-events-none">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/favicon.png"
              alt=""
              className="w-5 h-5 rounded-full"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
