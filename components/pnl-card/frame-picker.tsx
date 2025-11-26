"use client";

import { cn } from "@/lib/utils";

interface FramePickerProps {
  value: string;
  onChange: (value: string) => void;
}

const FRAMES = [
  { value: "none", label: "None", borderClass: "border-transparent" },
  {
    value: "neon-purple",
    label: "Purple",
    borderClass: "border-purple-500",
    glowClass: "shadow-[0_0_12px_rgba(168,85,247,0.6)]",
  },
  {
    value: "neon-cyan",
    label: "Cyan",
    borderClass: "border-cyan-500",
    glowClass: "shadow-[0_0_12px_rgba(6,182,212,0.6)]",
  },
  {
    value: "gold",
    label: "Gold",
    borderClass: "border-yellow-500",
    glowClass: "shadow-[0_0_12px_rgba(234,179,8,0.6)]",
  },
  {
    value: "holo",
    label: "Holo",
    borderClass: "border-gradient",
    gradientClass:
      "bg-gradient-to-r from-purple-500 via-cyan-500 to-pink-500",
  },
  {
    value: "mythic",
    label: "Mythic",
    borderClass: "border-orange-500",
    glowClass: "shadow-[0_0_18px_rgba(249,115,22,0.65)]",
  },
];

export default function FramePicker({ value, onChange }: FramePickerProps) {
  return (
    <div className="space-y-4">
      <h3 className="text-sm font-medium text-neutral-400">Frame</h3>
      <div className="grid grid-cols-3 gap-3">
        {FRAMES.map((frame) => (
          <button
            key={frame.value}
            onClick={() => onChange(frame.value)}
            className={cn(
              "p-2.5 rounded-xl border-2 transition-all duration-150 ease-out relative",
              "hover:scale-105 active:scale-[0.98]",
              value === frame.value
                ? "border-transparent tricolor-hover-border [&::before]:!opacity-100"
                : "border-neutral-800/60 hover:border-neutral-700"
            )}
          >
            {/* Frame preview box */}
            <div
              className={cn(
                "aspect-video rounded-lg border-2 bg-neutral-800 relative z-10",
                frame.borderClass,
                frame.glowClass
              )}
            >
              {frame.value === "holo" && (
                <div className="w-full h-full rounded-lg overflow-hidden">
                  <div
                    className={cn(
                      "w-full h-full opacity-40",
                      frame.gradientClass
                    )}
                  />
                </div>
              )}
            </div>
            <div
              className={cn(
                "text-xs mt-2.5 font-medium relative z-10",
                value === frame.value ? "text-white" : "text-neutral-400"
              )}
            >
              {frame.label}
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
