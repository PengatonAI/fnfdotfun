"use client";

import { cn } from "@/lib/utils";

interface ThemePickerProps {
  value: string;
  onChange: (value: string) => void;
}

const THEMES = [
  { value: "dark", label: "Dark", colors: ["#111111", "#1a1a1a", "#2a2a2a"] },
  { value: "neon", label: "Neon", colors: ["#0f0f23", "#A855F7", "#06B6D4"] },
  { value: "clean", label: "Clean", colors: ["#18181b", "#27272a", "#3f3f46"] },
  { value: "cyber", label: "Cyber", colors: ["#0a0a0f", "#00ff88", "#ff0080"] },
];

export default function ThemePicker({ value, onChange }: ThemePickerProps) {
  return (
    <div className="space-y-4">
      <h3 className="text-sm font-medium text-neutral-400">Theme</h3>
      <div className="grid grid-cols-4 gap-3">
        {THEMES.map((theme) => (
          <button
            key={theme.value}
            onClick={() => onChange(theme.value)}
            className={cn(
              "p-3 rounded-xl border-2 transition-all duration-150 ease-out relative",
              "hover:scale-[1.03] active:scale-[0.98]",
              value === theme.value
                ? "border-transparent tricolor-hover-border [&::before]:!opacity-100"
                : "border-neutral-800/60 hover:border-neutral-700"
            )}
          >
            {/* Theme preview squares */}
            <div className="flex gap-1.5 mb-2.5 justify-center relative z-10">
              {theme.colors.map((color, i) => (
                <div
                  key={i}
                  className="w-5 h-5 rounded-md"
                  style={{ backgroundColor: color }}
                />
              ))}
            </div>
            <div
              className={cn(
                "text-xs font-medium relative z-10",
                value === theme.value ? "text-white" : "text-neutral-400"
              )}
            >
              {theme.label}
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
