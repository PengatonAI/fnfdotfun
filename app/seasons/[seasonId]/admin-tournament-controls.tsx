"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import EditTournamentModal from "./edit-tournament-modal";

interface AdminTournamentControlsProps {
  season: {
    id: string;
    name: string;
    startAt: Date;
    endAt: Date;
    visibility: string | null;
    allowedChains: string | null;
    allowedUsers: string | null;
    allowedCrews: string | null;
    rules: string | null;
    description: string | null;
  };
}

export default function AdminTournamentControls({
  season,
}: AdminTournamentControlsProps) {
  const router = useRouter();
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isEnding, setIsEnding] = useState(false);
  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  const handleEndTournament = async () => {
    if (!confirm("Are you sure you want to end this tournament early?")) {
      return;
    }

    setIsEnding(true);
    setMessage(null);

    try {
      const response = await fetch(`/api/admin/seasons/${season.id}/end`, {
        method: "POST",
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to end tournament");
      }

      setMessage({ type: "success", text: "Tournament ended successfully!" });
      
      // Refresh page after a short delay
      setTimeout(() => {
        router.refresh();
      }, 1000);
    } catch (err) {
      setMessage({
        type: "error",
        text: err instanceof Error ? err.message : "Failed to end tournament",
      });
    } finally {
      setIsEnding(false);
    }
  };

  return (
    <>
      <div className="space-y-2">
        <div className="flex gap-2">
          <button
            onClick={() => setIsEditModalOpen(true)}
            className="px-3 py-1.5 text-xs font-medium rounded bg-secondary text-secondary-foreground hover:bg-secondary/80 transition-colors"
          >
            Edit Tournament
          </button>
          <button
            onClick={handleEndTournament}
            disabled={isEnding}
            className="px-3 py-1.5 text-xs font-medium rounded bg-[#ff4a4a]/20 text-[#ff4a4a] hover:bg-[#ff4a4a]/30 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isEnding ? "Ending..." : "End Tournament Early"}
          </button>
        </div>
        {message && (
          <div
            className={`p-2 rounded-lg text-xs ${
              message.type === "success"
                ? "bg-[#00d57a]/20 text-[#00d57a]"
                : "bg-[#ff4a4a]/20 text-[#ff4a4a]"
            }`}
          >
            {message.text}
          </div>
        )}
      </div>

      <EditTournamentModal
        season={{
          id: season.id,
          name: season.name,
          startAt: season.startAt.toISOString(),
          endAt: season.endAt.toISOString(),
          visibility: season.visibility,
          allowedChains: season.allowedChains,
          allowedUsers: season.allowedUsers,
          allowedCrews: season.allowedCrews,
          rules: season.rules,
          description: season.description,
        }}
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
      />
    </>
  );
}

