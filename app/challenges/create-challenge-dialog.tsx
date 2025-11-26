"use client";

import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import { mutate } from "swr";
import { X, Search, Swords, Clock, Users } from "lucide-react";

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
  fromCrewId: string;
  fromCrewName: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const DURATION_OPTIONS = [
  { label: "24 hours", value: 24 },
  { label: "3 days", value: 72 },
  { label: "7 days", value: 168 },
];

export default function CreateChallengeDialog({
  fromCrewId,
  fromCrewName,
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
          const filtered = results.filter((crew: SearchResult) => crew.id !== fromCrewId);
          setSearchResults(filtered);
        }
      } catch (err) {
        console.error("Search error:", err);
      } finally {
        setIsSearching(false);
      }
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [searchQuery, fromCrewId]);

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
          fromCrewId: fromCrewId,
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

  const handleClose = () => {
    onOpenChange(false);
  };

  if (!open) return null;

  // Use portal to escape PageTransition's transform/filter stacking context
  if (typeof document === "undefined") return null;

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/80 backdrop-blur-sm"
        onClick={handleClose}
      />

      {/* Dialog */}
      <div className="relative z-50 w-full max-w-lg rounded-2xl bg-gradient-to-br from-[#0d0d0d] via-[#111111] to-[#0a0a0a] border border-[#1a1a1a] shadow-[0_8px_40px_rgba(0,0,0,0.5),0_0_60px_rgba(168,85,247,0.1)] overflow-hidden">
        {/* Decorative glow */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-24 -right-24 w-64 h-64 bg-gradient-to-br from-accent/10 to-transparent rounded-full blur-3xl" />
          <div className="absolute -bottom-24 -left-24 w-48 h-48 bg-gradient-to-tr from-[#ff4a4a]/10 to-transparent rounded-full blur-3xl" />
        </div>

        <div className="relative p-6 max-h-[90vh] overflow-y-auto">
          {/* Close Button */}
          <button
            onClick={handleClose}
            className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-full bg-white/5 hover:bg-white/10 text-white/60 hover:text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>

          {/* Header */}
          <div className="mb-6">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-accent/20 to-accent/5 border border-accent/20 flex items-center justify-center">
                <Swords className="w-5 h-5 text-accent" />
              </div>
              <h2 className="text-xl font-semibold text-white">Challenge Another Crew</h2>
            </div>
            <p className="text-sm text-white/40">Select an opponent and set the battle duration</p>
          </div>

          {success ? (
            <div className="space-y-4">
              <div className="relative rounded-xl overflow-hidden bg-gradient-to-br from-[#00d57a]/10 to-[#00d57a]/5 border border-[#00d57a]/30 p-6">
                <div className="flex flex-col items-center text-center">
                  <div className="w-14 h-14 rounded-full bg-[#00d57a]/20 flex items-center justify-center mb-3">
                    <Swords className="w-7 h-7 text-[#00d57a]" />
                  </div>
                  <p className="text-[#00d57a] font-semibold text-lg">Challenge sent!</p>
                  <p className="text-sm text-white/50 mt-2">
                    {selectedCrew?.name} will be notified of your challenge.
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-5">
              {/* From Crew (Read-only) */}
              <div>
                <label className="flex items-center gap-2 text-sm font-medium text-white/80 mb-2">
                  <Users className="w-4 h-4 text-white/40" />
                  Your Crew
                </label>
                <div className="h-11 rounded-xl border border-[#2a2a2a] bg-[#0a0a0a] px-4 flex items-center">
                  <span className="font-medium text-white">{fromCrewName}</span>
                </div>
              </div>

              {/* Opponent Crew Search */}
              <div>
                <label className="flex items-center gap-2 text-sm font-medium text-white/80 mb-2">
                  <Search className="w-4 h-4 text-white/40" />
                  Challenge Crew <span className="text-[#ff4a4a]">*</span>
                </label>
                
                {selectedCrew ? (
                  <div className="flex items-center justify-between h-11 rounded-xl border border-accent/30 bg-accent/5 px-4">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-white">{selectedCrew.name}</span>
                      <span className="text-xs text-white/40">
                        ({selectedCrew.memberCount}/{selectedCrew.maxMembers} members)
                      </span>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleClearSelection}
                      className="text-white/50 hover:text-white h-7 px-2"
                    >
                      Change
                    </Button>
                  </div>
                ) : (
                  <div className="relative">
                    <div className="absolute left-4 top-1/2 -translate-y-1/2">
                      <Search className="w-4 h-4 text-white/30" />
                    </div>
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Search for a crew..."
                      className="w-full h-11 rounded-xl border border-[#2a2a2a] bg-[#0a0a0a] pl-11 pr-4 text-white placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-accent/50 focus:border-accent/50 transition-all"
                    />
                    
                    {/* Search Results Dropdown */}
                    {(searchResults.length > 0 || isSearching) && (
                      <div className="absolute top-full left-0 right-0 mt-2 max-h-60 overflow-y-auto rounded-xl border border-[#2a2a2a] bg-[#0d0d0d] shadow-[0_8px_30px_rgba(0,0,0,0.4)] z-10">
                        {isSearching ? (
                          <div className="p-4 text-sm text-white/40 text-center">
                            Searching...
                          </div>
                        ) : searchResults.length === 0 ? (
                          <div className="p-4 text-sm text-white/40 text-center">
                            No crews found
                          </div>
                        ) : (
                          searchResults.map((crew) => (
                            <button
                              key={crew.id}
                              onClick={() => handleSelectCrew(crew)}
                              className="w-full text-left p-4 hover:bg-white/5 transition-colors border-b border-[#1a1a1a] last:border-b-0"
                            >
                              <div className="flex items-center justify-between">
                                <div>
                                  <span className="font-medium text-white">{crew.name}</span>
                                  {crew.creator.username && (
                                    <span className="text-sm text-white/40 ml-2">
                                      by {crew.creator.username}
                                    </span>
                                  )}
                                </div>
                                <span className="text-xs text-white/30">
                                  {crew.memberCount}/{crew.maxMembers}
                                </span>
                              </div>
                              {crew.description && (
                                <p className="text-xs text-white/30 mt-1 line-clamp-1">
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
                  <p className="text-xs text-white/30 mt-2">
                    Type at least 2 characters to search
                  </p>
                )}
              </div>

              {/* Duration Selector */}
              <div>
                <label className="flex items-center gap-2 text-sm font-medium text-white/80 mb-2">
                  <Clock className="w-4 h-4 text-white/40" />
                  Challenge Duration
                </label>
                <div className="flex gap-2">
                  {DURATION_OPTIONS.map((option) => (
                    <button
                      key={option.value}
                      onClick={() => setDurationHours(option.value)}
                      className={`flex-1 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 ${
                        durationHours === option.value
                          ? "bg-[#0a0a0a] text-white border border-white/20 shadow-[0_0_15px_rgba(168,85,247,0.2)] tricolor-hover-border"
                          : "bg-[#0a0a0a]/50 text-white/50 border border-[#1a1a1a] hover:text-white hover:bg-[#0a0a0a] hover:border-white/10"
                      }`}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Challenge Info */}
              <div className="rounded-xl bg-[#0a0a0a]/50 border border-[#1a1a1a] p-4">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg bg-accent/10 flex items-center justify-center flex-shrink-0">
                    <Swords className="w-4 h-4 text-accent/60" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-white/70">PnL Battle</p>
                    <p className="text-xs text-white/40 mt-0.5">
                      The crew with the highest combined realized PnL wins.
                    </p>
                  </div>
                </div>
              </div>

              {/* Error Message */}
              {error && (
                <div className="rounded-xl bg-[#ff4a4a]/10 border border-[#ff4a4a]/30 p-3">
                  <p className="text-sm text-[#ff4a4a] text-center">{error}</p>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex gap-3 pt-2">
                <Button
                  type="button"
                  onClick={handleClose}
                  disabled={isSubmitting}
                  className="flex-1 h-11 bg-transparent border border-[#2a2a2a] text-white/60 hover:text-white rounded-xl hover:bg-white/5"
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  onClick={handleSubmit}
                  disabled={!selectedCrew || isSubmitting}
                  className="flex-1 h-11 bg-[#0a0a0a] border-white/10 hover:bg-transparent text-white rounded-xl tricolor-hover-border disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSubmitting ? "Sending..." : "Send Challenge"}
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}
