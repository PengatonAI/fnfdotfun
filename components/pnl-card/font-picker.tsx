"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";

interface FontPickerProps {
  value: string;
  onChange: (value: string) => void;
}

const FONTS = [
  { value: "Inter", label: "Inter", style: "font-sans" },
  { value: "Orbitron", label: "Orbitron", style: "font-mono" },
  { value: "Audiowide", label: "Audiowide", style: "font-mono" },
  { value: "Space Grotesk", label: "Space Grotesk", style: "font-sans" },
  { value: "VT323", label: "VT323", style: "font-mono" },
];

export default function FontPicker({ value, onChange }: FontPickerProps) {
  const [isOpen, setIsOpen] = useState(false);

  const selectedFont = FONTS.find((f) => f.value === value) || FONTS[0];

  return (
    <div className="space-y-4">
      <h3 className="text-sm font-medium text-neutral-400">Font</h3>
      <div className="relative">
        {/* Dropdown trigger */}
        <button
          onClick={() => setIsOpen(!isOpen)}
          className={cn(
            "w-full px-4 py-3.5 rounded-xl border-2 text-left transition-all duration-150 ease-out relative",
            "flex items-center justify-between",
            "hover:scale-[1.01]",
            isOpen
              ? "border-transparent tricolor-hover-border [&::before]:!opacity-100"
              : "border-neutral-800/60 hover:border-neutral-700 tricolor-hover-border"
          )}
        >
          <span className={cn("text-white font-medium relative z-10", selectedFont.style)}>
            {selectedFont.label}
          </span>
          <svg
            className={cn(
              "w-4 h-4 text-neutral-400 transition-transform duration-150 relative z-10",
              isOpen && "rotate-180"
            )}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M19 9l-7 7-7-7"
            />
          </svg>
        </button>

        {/* Dropdown menu */}
        {isOpen && (
          <div className="absolute z-20 w-full mt-2 py-2 rounded-xl border-2 border-neutral-700 bg-neutral-900 shadow-[0_10px_40px_rgba(0,0,0,0.5)]">
            {FONTS.map((font) => (
              <button
                key={font.value}
                onClick={() => {
                  onChange(font.value);
                  setIsOpen(false);
                }}
                className={cn(
                  "w-full px-4 py-3 text-left transition-all duration-150",
                  "hover:bg-white/5",
                  value === font.value
                    ? "text-white bg-white/10"
                    : "text-neutral-300"
                )}
              >
                <span className={cn("font-medium", font.style)}>{font.label}</span>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
