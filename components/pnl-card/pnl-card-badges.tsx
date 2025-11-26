"use client";

interface PnLCardBadgesProps {
  badges: string[];
}

// Badge to icon mapping
const BADGE_MAP: Record<string, { icon: string; label: string }> = {
  og: { icon: "🏆", label: "OG" },
  "season-winner": { icon: "👑", label: "Season Winner" },
  "top-1": { icon: "💎", label: "Top 1%" },
  "no-liquidations": { icon: "🛡️", label: "No Liquidations" },
  "crew-mvp": { icon: "⭐", label: "Crew MVP" },
};

export default function PnLCardBadges({ badges }: PnLCardBadgesProps) {
  if (!badges || badges.length === 0) {
    return null;
  }

  return (
    <div className="flex flex-wrap justify-center gap-2 mt-4">
      {badges.map((badge) => {
        const badgeInfo = BADGE_MAP[badge];
        if (!badgeInfo) return null;

        return (
          <div
            key={badge}
            className="px-3 py-1 rounded-full border border-purple-500/50 bg-purple-500/10 shadow-[0_0_10px_rgba(168,85,247,0.35)] text-sm flex items-center gap-1.5"
          >
            <span>{badgeInfo.icon}</span>
            <span className="text-purple-200">{badgeInfo.label}</span>
          </div>
        );
      })}
    </div>
  );
}
