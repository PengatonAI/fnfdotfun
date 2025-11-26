"use client";

import { cn } from "@/lib/utils";

interface TimeRangePickerProps {
  value: "24h" | "7d" | "30d" | "all";
  onChange: (range: "24h" | "7d" | "30d" | "all") => void;
}

const RANGES: Array<{ value: "24h" | "7d" | "30d" | "all"; label: string }> = [
  { value: "24h", label: "24h" },
  { value: "7d", label: "7d" },
  { value: "30d", label: "30d" },
  { value: "all", label: "All" },
];

export default function TimeRangePicker({
  value,
  onChange,
}: TimeRangePickerProps) {
  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-neutral-200">Time Range</h3>
      <div className="flex gap-3">
        {RANGES.map((range) => (
          <button
            key={range.value}
            onClick={() => onChange(range.value)}
            className={cn(
              "flex-1 px-4 py-3 rounded-xl border-2 text-sm font-semibold transition-all duration-150 ease-out relative",
              "hover:scale-[1.02] active:scale-[0.98]",
              value === range.value
                ? "border-transparent bg-white/5 text-white tricolor-hover-border [&::before]:!opacity-100"
                : "border-neutral-800/60 bg-neutral-900/50 text-neutral-400 hover:border-neutral-700 hover:text-neutral-300 hover:bg-neutral-800/50"
            )}
          >
            <span className="relative z-10">{range.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
