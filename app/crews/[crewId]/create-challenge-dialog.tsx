"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import { mutate } from "swr";

interface SearchResult {
  id: string;
  name: string;
  description: string | null;
  memberCount: number;
  maxMembers: number;
  creator: {
    id: string;
    username: string | null;
    xHandle: string | null;
  };
}

interface CreateChallengeDialogProps {
  crewId: string;
  crewName: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const DURATION_OPTIONS = [
  { label: "24 hours", value: 24 },
  { label: "3 days", value: 72 },
  { label: "7 days", value: 168 },
];

export default function CreateChallengeDialog({
  crewId,
  crewName,
  open,
  onOpenChange,
}: CreateChallengeDialogProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedCrew, setSelectedCrew] = useState<SearchResult | null>(null);
  const [durationHours, setDurationHours] = useState(24);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const router = useRouter();

  // Debounced search
  useEffect(() => {
    if (!searchQuery || searchQuery.trim().length < 2) {
      setSearchResults([]);
      return;
    }

    const timeoutId = setTimeout(async () => {
      setIsSearching(true);
      try {
        const response = await fetch(
          `/api/crews/search?query=${encodeURIComponent(searchQuery.trim())}&limit=10`
        );
        if (response.ok) {
          const results = await response.json();
          // Filter out the current crew from results
          const filtered = results.filter((crew: SearchResult) => crew.id !== crewId);
          setSearchResults(filtered);
        }
      } catch (err) {
        console.error("Search error:", err);
      } finally {
        setIsSearching(false);
      }
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [searchQuery, crewId]);

  // Reset state when dialog closes
  useEffect(() => {
    if (!open) {
      setSearchQuery("");
      setSearchResults([]);
      setSelectedCrew(null);
      setDurationHours(24);
      setError(null);
      setSuccess(false);
    }
  }, [open]);

  const handleSelectCrew = (crew: SearchResult) => {
    setSelectedCrew(crew);
    setSearchQuery("");
    setSearchResults([]);
    setError(null);
  };

  const handleClearSelection = () => {
    setSelectedCrew(null);
    setError(null);
  };

  const handleSubmit = async () => {
    if (!selectedCrew) {
      setError("Please select a crew to challenge");
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const response = await fetch("/api/challenges", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          fromCrewId: crewId,
          toCrewId: selectedCrew.id,
          durationHours,
          type: "pnl",
          visibility: "public",
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to create challenge");
      }

      setSuccess(true);
      
      // Refresh SWR caches
      mutate("/api/challenges?scope=all");
      mutate("/api/challenges/unread-count");
      
      // Close dialog and refresh after short delay
      setTimeout(() => {
        onOpenChange(false);
        router.refresh();
      }, 1500);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div
        className="fixed inset-0 bg-background/80 backdrop-blur-sm"
        onClick={() => onOpenChange(false)}
      />
      <div className="relative z-50 w-full max-w-lg rounded-lg border bg-card p-6 shadow-lg">
        <h2 className="text-xl font-semibold mb-4">Challenge Another Crew</h2>

        {success ? (
          <div className="space-y-4">
            <div className="p-4 rounded-lg bg-green-500/10 border border-green-500/30">
              <p className="text-green-500 font-medium">Challenge sent!</p>
              <p className="text-sm text-muted-foreground mt-1">
                {selectedCrew?.name} will be notified of your challenge.
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            {/* From Crew (Read-only) */}
            <div>
              <label className="block text-sm font-medium mb-2">
                Your Crew
              </label>
              <div className="p-3 rounded-md border border-border bg-muted/50">
                <span className="font-medium">{crewName}</span>
              </div>
            </div>

            {/* Opponent Crew Search */}
            <div>
              <label className="block text-sm font-medium mb-2">
                Challenge Crew *
              </label>
              
              {selectedCrew ? (
                <div className="flex items-center justify-between p-3 rounded-md border border-primary bg-primary/5">
                  <div>
                    <span className="font-medium">{selectedCrew.name}</span>
                    <span className="text-sm text-muted-foreground ml-2">
                      ({selectedCrew.memberCount}/{selectedCrew.maxMembers} members)
                    </span>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleClearSelection}
                  >
                    Change
                  </Button>
                </div>
              ) : (
                <div className="relative">
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search for a crew..."
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  />
                  
                  {/* Search Results Dropdown */}
                  {(searchResults.length > 0 || isSearching) && (
                    <div className="absolute top-full left-0 right-0 mt-1 max-h-60 overflow-y-auto rounded-md border border-border bg-card shadow-lg z-10">
                      {isSearching ? (
                        <div className="p-3 text-sm text-muted-foreground">
                          Searching...
                        </div>
                      ) : searchResults.length === 0 ? (
                        <div className="p-3 text-sm text-muted-foreground">
                          No crews found
                        </div>
                      ) : (
                        searchResults.map((crew) => (
                          <button
                            key={crew.id}
                            onClick={() => handleSelectCrew(crew)}
                            className="w-full text-left p-3 hover:bg-muted/50 transition-colors border-b border-border last:border-b-0"
                          >
                            <div className="flex items-center justify-between">
                              <div>
                                <span className="font-medium">{crew.name}</span>
                                {crew.creator.username && (
                                  <span className="text-sm text-muted-foreground ml-2">
                                    by {crew.creator.username}
                                  </span>
                                )}
                              </div>
                              <span className="text-xs text-muted-foreground">
                                {crew.memberCount}/{crew.maxMembers}
                              </span>
                            </div>
                            {crew.description && (
                              <p className="text-xs text-muted-foreground mt-1 line-clamp-1">
                                {crew.description}
                              </p>
                            )}
                          </button>
                        ))
                      )}
                    </div>
                  )}
                </div>
              )}
              
              {searchQuery.length > 0 && searchQuery.length < 2 && (
                <p className="text-xs text-muted-foreground mt-1">
                  Type at least 2 characters to search
                </p>
              )}
            </div>

            {/* Duration Selector */}
            <div>
              <label className="block text-sm font-medium mb-2">
                Challenge Duration
              </label>
              <div className="flex gap-2">
                {DURATION_OPTIONS.map((option) => (
                  <button
                    key={option.value}
                    onClick={() => setDurationHours(option.value)}
                    className={`flex-1 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                      durationHours === option.value
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted hover:bg-muted/80 text-foreground"
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Challenge Info */}
            <div className="p-3 rounded-md bg-muted/50 border border-border">
              <p className="text-sm text-muted-foreground">
                <strong>Type:</strong> PnL Battle — The crew with the highest combined realized PnL wins.
              </p>
            </div>

            {/* Error Message */}
            {error && (
              <p className="text-sm text-destructive">{error}</p>
            )}

            {/* Action Buttons */}
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={!selectedCrew || isSubmitting}
              >
                {isSubmitting ? "Sending..." : "Send Challenge"}
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

