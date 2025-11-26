"use client";

import { cn } from "@/lib/utils";
import { ReactNode } from "react";

interface PnLCardFrameProps {
  frame: string;
  children: ReactNode;
}

// Frame styles mapping
const FRAME_STYLES: Record<string, { outer: string; inner?: string }> = {
  none: {
    outer: "border border-neutral-800",
  },
  "neon-purple": {
    outer:
      "border-2 border-purple-500 shadow-[0_0_20px_rgba(168,85,247,0.5),inset_0_0_20px_rgba(168,85,247,0.1)]",
  },
  "neon-cyan": {
    outer:
      "border-2 border-cyan-500 shadow-[0_0_20px_rgba(6,182,212,0.5),inset_0_0_20px_rgba(6,182,212,0.1)]",
  },
  gold: {
    outer:
      "border-2 border-yellow-500 shadow-[0_0_20px_rgba(234,179,8,0.4),inset_0_0_15px_rgba(234,179,8,0.1)]",
  },
  holo: {
    outer:
      "border-2 border-transparent bg-gradient-to-br from-purple-500 via-cyan-500 to-pink-500 p-[2px]",
    inner: "bg-neutral-900 rounded-xl",
  },
  mythic: {
    outer:
      "border-2 border-orange-500 shadow-[0_0_25px_rgba(249,115,22,0.6)] animate-pulse-glow",
  },
};

export default function PnLCardFrame({ frame, children }: PnLCardFrameProps) {
  const frameStyle = FRAME_STYLES[frame] || FRAME_STYLES.none;

  if (frame === "holo") {
    // Holo frame needs special nested structure for gradient border
    return (
      <div className={cn("rounded-xl", frameStyle.outer)}>
        <div className={cn("rounded-xl p-4", frameStyle.inner)}>{children}</div>
      </div>
    );
  }

  return (
    <div className={cn("rounded-xl p-4 bg-black/40 backdrop-blur-sm", frameStyle.outer)}>
      {children}
    </div>
  );
}
