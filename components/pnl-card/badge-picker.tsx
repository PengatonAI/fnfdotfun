"use client";

import { cn } from "@/lib/utils";

interface BadgePickerProps {
  value: string[];
  onChange: (badges: string[]) => void;
}

const BADGES = [
  { value: "og", label: "OG", icon: "🏆" },
  { value: "season-winner", label: "Season Winner", icon: "👑" },
  { value: "top-1", label: "Top 1%", icon: "💎" },
  { value: "no-liquidations", label: "No Liquidations", icon: "🛡️" },
  { value: "crew-mvp", label: "Crew MVP", icon: "⭐" },
];

export default function BadgePicker({ value, onChange }: BadgePickerProps) {
  const toggleBadge = (badge: string) => {
    if (value.includes(badge)) {
      onChange(value.filter((b) => b !== badge));
    } else {
      onChange([...value, badge]);
    }
  };

  return (
    <div className="space-y-4">
      <h3 className="text-sm font-medium text-neutral-400">Badges</h3>
      <div className="flex flex-wrap gap-2.5">
        {BADGES.map((badge) => {
          const isActive = value.includes(badge.value);
          return (
            <button
              key={badge.value}
              onClick={() => toggleBadge(badge.value)}
              className={cn(
                "px-3.5 py-2.5 rounded-lg border-2 text-sm font-medium transition-all duration-150 ease-out relative",
                "flex items-center gap-2",
                "hover:scale-[1.03] active:scale-[0.98]",
                isActive
                  ? "border-transparent bg-white/5 text-white tricolor-hover-border [&::before]:!opacity-100"
                  : "border-neutral-800/60 bg-neutral-900/50 text-neutral-400 hover:border-neutral-700 hover:text-neutral-300"
              )}
            >
              <span className="text-base relative z-10">{badge.icon}</span>
              <span className="relative z-10">{badge.label}</span>
            </button>
          );
        })}
      </div>
      <p className="text-xs text-neutral-500">
        Select badges to display on your card
      </p>
    </div>
  );
}
