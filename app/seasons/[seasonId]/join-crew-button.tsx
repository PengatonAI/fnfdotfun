"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

interface JoinCrewButtonProps {
  seasonId: string;
  disabled?: boolean;
  disabledMessage?: string;
}

export default function JoinCrewButton({
  seasonId,
  disabled = false,
  disabledMessage,
}: JoinCrewButtonProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const handleJoin = async () => {
    if (disabled) return;

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/seasons/${seasonId}/join-crew`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to join tournament as crew");
      }

      // Refresh the page to show updated state
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
      setLoading(false);
    }
  };

  if (disabled) {
    return (
      <div className="space-y-2">
        <Button
          disabled
          className="w-full bg-secondary text-muted-foreground cursor-not-allowed"
          size="lg"
        >
          Join as Crew
        </Button>
        {disabledMessage && (
          <p className="text-sm text-muted-foreground">{disabledMessage}</p>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <Button
        onClick={handleJoin}
        disabled={loading}
        className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-semibold"
        size="lg"
      >
        {loading ? "Joining..." : "Join as Crew"}
      </Button>
      {error && (
        <p className="text-sm text-[#ff4a4a]">{error}</p>
      )}
    </div>
  );
}

