"use client";

import { useState, useEffect } from "react";
import PnLCardPreview from "@/components/pnl-card/pnl-card-preview";
import CardModeToggle from "@/components/pnl-card/card-mode-toggle";
import TimeRangePicker from "@/components/pnl-card/time-range-picker";
import ThemePicker from "@/components/pnl-card/theme-picker";
import ColorPicker from "@/components/pnl-card/color-picker";
import FontPicker from "@/components/pnl-card/font-picker";
import FramePicker from "@/components/pnl-card/frame-picker";
import BadgePicker from "@/components/pnl-card/badge-picker";
import ShareButtons from "@/components/pnl-card/share-buttons";

// Default settings when no saved settings exist
const defaultSettings = {
  theme: "dark",
  backgroundColor: "#111111",
  accentColor: "#A855F7",
  showAvatar: true,
  showUsername: true,
  showPnl: true,
  showVolume: true,
  showWinRate: true,
  showTotalTrades: true,
  font: "Inter",
  frame: "none",
  badges: [] as string[],
};

// Builder state shape
interface BuilderState {
  mode: "user" | "crew";
  crewId?: string;
  range: "24h" | "7d" | "30d" | "all";
  settings: typeof defaultSettings;
  stats: any;
  loadingStats: boolean;
  savingSettings: boolean;
  savingCard: boolean;
}

interface SavedSettings {
  theme?: string;
  backgroundColor?: string;
  accentColor?: string;
  showAvatar?: boolean;
  showUsername?: boolean;
  showPnl?: boolean;
  showVolume?: boolean;
  showWinRate?: boolean;
  showTotalTrades?: boolean;
  font?: string;
  frame?: string;
  badges?: string[];
  mode?: "user" | "crew";
  timeRange?: "24h" | "7d" | "30d" | "all";
}

interface PnLCardBuilderProps {
  initialCrewId?: string | null;
  savedSettings?: SavedSettings | null;
}

export default function PnLCardBuilder({
  initialCrewId,
  savedSettings,
}: PnLCardBuilderProps) {
  // Toast state
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);

  // Initialize state with savedSettings or defaults
  const [state, setState] = useState<BuilderState>(() => {
    const mergedSettings = {
      theme: savedSettings?.theme || defaultSettings.theme,
      backgroundColor: savedSettings?.backgroundColor || defaultSettings.backgroundColor,
      accentColor: savedSettings?.accentColor || defaultSettings.accentColor,
      showAvatar: savedSettings?.showAvatar ?? defaultSettings.showAvatar,
      showUsername: savedSettings?.showUsername ?? defaultSettings.showUsername,
      showPnl: savedSettings?.showPnl ?? defaultSettings.showPnl,
      showVolume: savedSettings?.showVolume ?? defaultSettings.showVolume,
      showWinRate: savedSettings?.showWinRate ?? defaultSettings.showWinRate,
      showTotalTrades: savedSettings?.showTotalTrades ?? defaultSettings.showTotalTrades,
      font: savedSettings?.font || defaultSettings.font,
      frame: savedSettings?.frame || defaultSettings.frame,
      badges: savedSettings?.badges || defaultSettings.badges,
    };

    return {
      mode: savedSettings?.mode || "user",
      crewId: initialCrewId || undefined,
      range: savedSettings?.timeRange || "all",
      settings: mergedSettings,
      stats: null,
      loadingStats: false,
      savingSettings: false,
      savingCard: false,
    };
  });

  // Auto-hide toast after 3 seconds
  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  // Fetch stats when mode or range changes
  useEffect(() => {
    async function fetchStats() {
      setState((prev) => ({ ...prev, loadingStats: true }));

      // Build endpoint based on mode
      let endpoint: string;
      if (state.mode === "user") {
        endpoint = `/api/pnl-card/user-stats?range=${state.range}`;
      } else {
        // For crew mode, need crewId
        if (!state.crewId) {
          setState((prev) => ({ ...prev, loadingStats: false, stats: null }));
          return;
        }
        endpoint = `/api/pnl-card/crew-stats?crewId=${state.crewId}&range=${state.range}`;
      }

      try {
        const res = await fetch(endpoint);
        const data = await res.json();

        setState((prev) => ({
          ...prev,
          stats: data,
          loadingStats: false,
        }));
      } catch (err) {
        console.error("Error fetching stats:", err);
        setState((prev) => ({ ...prev, loadingStats: false }));
      }
    }

    fetchStats();
  }, [state.mode, state.range, state.crewId]);

  // Handle saving card settings
  const handleSaveSettings = async () => {
    setState((prev) => ({ ...prev, savingCard: true }));

    try {
      const res = await fetch("/api/pnl-card/save-settings", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          mode: state.mode,
          timeRange: state.range,
          theme: state.settings.theme,
          accentColor: state.settings.accentColor,
          backgroundColor: state.settings.backgroundColor,
          font: state.settings.font,
          frame: state.settings.frame,
          badges: state.settings.badges,
          showAvatar: state.settings.showAvatar,
          showUsername: state.settings.showUsername,
          showPnl: state.settings.showPnl,
          showVolume: state.settings.showVolume,
          showWinRate: state.settings.showWinRate,
          showTotalTrades: state.settings.showTotalTrades,
        }),
      });

      if (res.ok) {
        setToast({ message: "Card settings saved.", type: "success" });
      } else {
        setToast({ message: "Failed to save settings.", type: "error" });
      }
    } catch (err) {
      console.error("Error saving settings:", err);
      setToast({ message: "Failed to save settings.", type: "error" });
    } finally {
      setState((prev) => ({ ...prev, savingCard: false }));
    }
  };

  // Handle quick download
  const handleQuickDownload = async () => {
    setState((prev) => ({ ...prev, savingSettings: true }));

    try {
      const res = await fetch("/api/pnl-card/share", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          type: state.mode,
          crewId: state.mode === "crew" ? state.crewId : undefined,
          settings: state.settings,
          stats: state.stats,
          range: state.range,
        }),
      });

      const data = await res.json();

      if (res.ok && data.cardId) {
        window.open(`/pnl-card/${data.cardId}/download`, "_blank");
      }
    } catch (err) {
      console.error("Error creating download:", err);
    } finally {
      setState((prev) => ({ ...prev, savingSettings: false }));
    }
  };

  return (
    <div className="flex gap-8 p-6 lg:p-8">
      {/* Left Column - Controls */}
      <div className="w-[60%] space-y-8">
        {/* Header */}
        <div className="space-y-2">
          <h1 className="text-2xl font-bold text-neutral-100 tracking-wide">
            PnL Card Builder
          </h1>
          <p className="text-sm text-neutral-400">
            Customize and share your trading performance
          </p>
        </div>

        {/* Mode Toggle Section */}
        <section className="p-5 rounded-2xl bg-neutral-900/60 border border-neutral-800/60 backdrop-blur-sm">
          <CardModeToggle
            mode={state.mode}
            canUseCrewMode={Boolean(initialCrewId)}
            onChange={(newMode) => {
              setState((prev) => ({
                ...prev,
                mode: newMode,
              }));
            }}
          />
        </section>

        {/* Time Range Section */}
        <section className="p-5 rounded-2xl bg-neutral-900/60 border border-neutral-800/60 backdrop-blur-sm">
          <TimeRangePicker
            value={state.range}
            onChange={(newRange) => {
              setState((prev) => ({ ...prev, range: newRange }));
            }}
          />
        </section>

        {/* Customization Controls Section */}
        <section className="p-5 rounded-2xl bg-neutral-900/60 border border-neutral-800/60 backdrop-blur-sm">
          <h2 className="text-lg font-semibold text-neutral-200 mb-5">
            Appearance
          </h2>
          <div className="space-y-7">
            <ThemePicker
              value={state.settings.theme}
              onChange={(v) =>
                setState((prev) => ({
                  ...prev,
                  settings: { ...prev.settings, theme: v },
                }))
              }
            />

            <ColorPicker
              value={state.settings.accentColor}
              onChange={(v) =>
                setState((prev) => ({
                  ...prev,
                  settings: { ...prev.settings, accentColor: v },
                }))
              }
            />

            <FontPicker
              value={state.settings.font || "Inter"}
              onChange={(v) =>
                setState((prev) => ({
                  ...prev,
                  settings: { ...prev.settings, font: v },
                }))
              }
            />

            <FramePicker
              value={state.settings.frame || "none"}
              onChange={(v) =>
                setState((prev) => ({
                  ...prev,
                  settings: { ...prev.settings, frame: v },
                }))
              }
            />

            <BadgePicker
              value={state.settings.badges || []}
              onChange={(badges) =>
                setState((prev) => ({
                  ...prev,
                  settings: { ...prev.settings, badges },
                }))
              }
            />
          </div>
        </section>

        {/* Share Section */}
        <section className="p-5 rounded-2xl bg-neutral-900/60 border border-neutral-800/60 backdrop-blur-sm">
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-neutral-200">
              Share Your Card
            </h3>
            <ShareButtons
              mode={state.mode}
              crewId={state.crewId}
              settings={state.settings}
              stats={state.stats}
              range={state.range}
            />
          </div>
        </section>

        {/* Download Section */}
        <section className="p-5 rounded-2xl bg-neutral-900/60 border border-neutral-800/60 backdrop-blur-sm">
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-neutral-200">
              Download Your Card
            </h3>
            <button
              onClick={handleQuickDownload}
              disabled={state.savingSettings}
              className="relative w-full py-3.5 px-4 rounded-xl font-semibold transition-all duration-150 ease-out bg-neutral-900 border border-neutral-700 text-white hover:scale-[1.01] active:scale-[0.99] flex items-center justify-center gap-2.5 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 tricolor-hover-border"
            >
              {state.savingSettings ? (
                <>
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin relative z-10" />
                  <span className="relative z-10">Generating...</span>
                </>
              ) : (
                <>
                  <svg
                    className="w-5 h-5 relative z-10"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                    />
                  </svg>
                  <span className="relative z-10">Download PNG</span>
                </>
              )}
            </button>
            <p className="text-xs text-neutral-500 text-center">
              Downloads a 1200×630 PNG image of your card
            </p>
          </div>
        </section>
      </div>

      {/* Right Column - Preview */}
      <div className="w-[40%]">
        <div className="sticky top-6 space-y-4">
          <PnLCardPreview
            settings={state.settings}
            stats={state.loadingStats ? null : state.stats}
            loading={state.loadingStats}
          />

          {/* Save Card Settings Button */}
          <button
            onClick={handleSaveSettings}
            disabled={state.savingCard}
            className="relative w-full py-3.5 px-4 rounded-xl font-semibold transition-all duration-150 ease-out bg-neutral-900 border border-neutral-700 text-white hover:scale-[1.01] active:scale-[0.99] flex items-center justify-center gap-2.5 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 tricolor-hover-border"
          >
            {state.savingCard ? (
              <>
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin relative z-10" />
                <span className="relative z-10">Saving...</span>
              </>
            ) : (
              <>
                <svg
                  className="w-5 h-5 relative z-10"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4"
                  />
                </svg>
                <span className="relative z-10">Save Card Settings</span>
              </>
            )}
          </button>
          <p className="text-xs text-neutral-500 text-center">
            Save your settings to use on the dashboard and when you return
          </p>
        </div>
      </div>

      {/* Toast Notification */}
      {toast && (
        <div
          className={`fixed bottom-6 right-6 px-4 py-3 rounded-xl shadow-lg transition-all duration-300 z-50 flex items-center gap-2 ${
            toast.type === "success"
              ? "bg-[#00d57a]/20 border border-[#00d57a]/30 text-[#00d57a]"
              : "bg-[#ff4a4a]/20 border border-[#ff4a4a]/30 text-[#ff4a4a]"
          }`}
        >
          {toast.type === "success" ? (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          ) : (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          )}
          <span className="font-medium">{toast.message}</span>
        </div>
      )}
    </div>
  );
}
