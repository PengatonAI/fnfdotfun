"use client";

import { useRef } from "react";
import { cn } from "@/lib/utils";

interface ColorPickerProps {
  value: string;
  onChange: (value: string) => void;
}

const PRESET_COLORS = [
  "#A855F7", // Purple
  "#06B6D4", // Cyan
  "#22C55E", // Green
  "#EAB308", // Yellow
  "#EF4444", // Red
  "#EC4899", // Pink
  "#F97316", // Orange
  "#3B82F6", // Blue
];

export default function ColorPicker({ value, onChange }: ColorPickerProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  const handleClick = () => {
    inputRef.current?.click();
  };

  return (
    <div className="space-y-4">
      <h3 className="text-sm font-medium text-neutral-400">Accent Color</h3>
      <div className="flex items-center gap-5">
        {/* Color circle button */}
        <button
          onClick={handleClick}
          className="relative group"
        >
          <div
            className="w-14 h-14 rounded-full border-2 border-neutral-700 transition-all duration-150 ease-out group-hover:border-neutral-500 group-hover:shadow-[0_0_25px_rgba(168,85,247,0.4)] group-hover:scale-105"
            style={{ backgroundColor: value }}
          />
          <div className="absolute inset-0 rounded-full ring-2 ring-transparent group-hover:ring-cyan-500/30 transition-all duration-150" />
        </button>

        {/* Hex display */}
        <div className="flex items-center gap-2">
          <span className="text-sm text-neutral-300 font-mono uppercase tracking-wider">
            {value}
          </span>
        </div>

        {/* Hidden color input */}
        <input
          ref={inputRef}
          type="color"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="sr-only"
        />
      </div>

      {/* Preset colors */}
      <div className="flex gap-2.5 mt-3">
        {PRESET_COLORS.map((color) => (
          <button
            key={color}
            onClick={() => onChange(color)}
            className={cn(
              "w-7 h-7 rounded-full border-2 transition-all duration-150 ease-out hover:scale-110",
              value === color
                ? "border-white shadow-[0_0_12px_rgba(255,255,255,0.4)]"
                : "border-neutral-700 hover:border-neutral-500"
            )}
            style={{ backgroundColor: color }}
          />
        ))}
      </div>
    </div>
  );
}
