"use client";

import { cn } from "@/lib/utils";

interface CardModeToggleProps {
  mode: "user" | "crew";
  canUseCrewMode: boolean;
  onChange: (mode: "user" | "crew") => void;
}

export default function CardModeToggle({
  mode,
  canUseCrewMode,
  onChange,
}: CardModeToggleProps) {
  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-neutral-200">Card Mode</h3>
      <div className="flex gap-3">
        {/* User Card Button */}
        <button
          onClick={() => onChange("user")}
          className={cn(
            "flex-1 px-4 py-3.5 rounded-xl border-2 text-sm font-semibold transition-all duration-150 ease-out relative",
            "hover:scale-[1.02] active:scale-[0.98]",
            mode === "user"
              ? "border-transparent bg-white/5 text-white tricolor-hover-border [&::before]:!opacity-100"
              : "border-neutral-800/60 bg-neutral-900/50 text-neutral-400 hover:border-neutral-700 hover:text-neutral-300"
          )}
        >
          <div className="flex items-center justify-center gap-2.5 relative z-10">
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
              />
            </svg>
            <span>User Card</span>
          </div>
        </button>

        {/* Crew Card Button */}
        <button
          onClick={() => canUseCrewMode && onChange("crew")}
          disabled={!canUseCrewMode}
          className={cn(
            "flex-1 px-4 py-3.5 rounded-xl border-2 text-sm font-semibold transition-all duration-150 ease-out relative",
            !canUseCrewMode && "opacity-40 cursor-not-allowed",
            canUseCrewMode && "hover:scale-[1.02] active:scale-[0.98]",
            mode === "crew"
              ? "border-transparent bg-white/5 text-white tricolor-hover-border [&::before]:!opacity-100"
              : "border-neutral-800/60 bg-neutral-900/50 text-neutral-400 hover:border-neutral-700 hover:text-neutral-300"
          )}
        >
          <div className="flex items-center justify-center gap-2.5 relative z-10">
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
              />
            </svg>
            <span>Crew Card</span>
          </div>
        </button>
      </div>
      {!canUseCrewMode && (
        <p className="text-xs text-neutral-500">
          Join a crew to create crew cards
        </p>
      )}
    </div>
  );
}
