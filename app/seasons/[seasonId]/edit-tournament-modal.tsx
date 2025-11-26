"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

interface EditTournamentModalProps {
  season: {
    id: string;
    name: string;
    startAt: string;
    endAt: string;
    visibility: string | null;
    allowedChains: string | null;
    allowedUsers: string | null;
    allowedCrews: string | null;
    rules: string | null;
    description: string | null;
  };
  isOpen: boolean;
  onClose: () => void;
}

export default function EditTournamentModal({
  season,
  isOpen,
  onClose,
}: EditTournamentModalProps) {
  const router = useRouter();
  const [name, setName] = useState(season.name);
  const [startAt, setStartAt] = useState(
    new Date(season.startAt).toISOString().slice(0, 16)
  );
  const [endAt, setEndAt] = useState(
    new Date(season.endAt).toISOString().slice(0, 16)
  );
  const [visibility, setVisibility] = useState<"public" | "private">(
    (season.visibility as "public" | "private") || "public"
  );
  const [allowedChains, setAllowedChains] = useState<string[]>([]);
  const [allowedUsers, setAllowedUsers] = useState("");
  const [allowedCrews, setAllowedCrews] = useState("");
  const [description, setDescription] = useState(season.description || "");
  const [rules, setRules] = useState(season.rules || "");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  // Parse initial values
  useEffect(() => {
    if (season.allowedChains) {
      try {
        const chains = JSON.parse(season.allowedChains);
        setAllowedChains(Array.isArray(chains) ? chains : []);
      } catch {
        setAllowedChains([]);
      }
    }
    if (season.allowedUsers) {
      try {
        const users = JSON.parse(season.allowedUsers);
        setAllowedUsers(Array.isArray(users) ? users.join(", ") : "");
      } catch {
        setAllowedUsers("");
      }
    }
    if (season.allowedCrews) {
      try {
        const crews = JSON.parse(season.allowedCrews);
        setAllowedCrews(Array.isArray(crews) ? crews.join(", ") : "");
      } catch {
        setAllowedCrews("");
      }
    }
    setDescription(season.description || "");
    setRules(season.rules || "");
  }, [season]);

  const handleChainChange = (chain: "EVM" | "SOL", checked: boolean) => {
    if (checked) {
      setAllowedChains([...allowedChains, chain]);
    } else {
      setAllowedChains(allowedChains.filter((c) => c !== chain));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setMessage(null);

    try {
      // Convert comma-separated fields to arrays
      const allowedUsersArray = allowedUsers
        .split(",")
        .map((s) => s.trim())
        .filter((s) => s.length > 0);
      const allowedCrewsArray = allowedCrews
        .split(",")
        .map((s) => s.trim())
        .filter((s) => s.length > 0);

      // Convert datetime-local to ISO string
      const startAtISO = new Date(startAt).toISOString();
      const endAtISO = new Date(endAt).toISOString();

      const response = await fetch(`/api/admin/seasons/${season.id}/update`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name,
          startAt: startAtISO,
          endAt: endAtISO,
          visibility,
          allowedChains: allowedChains.length > 0 ? allowedChains : undefined,
          allowedUsers: allowedUsersArray.length > 0 ? allowedUsersArray : undefined,
          allowedCrews: allowedCrewsArray.length > 0 ? allowedCrewsArray : undefined,
          description: description || undefined,
          rules: rules || undefined,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to update tournament");
      }

      setMessage({ type: "success", text: "Tournament updated successfully!" });
      
      // Close modal and refresh after a short delay
      setTimeout(() => {
        onClose();
        router.refresh();
      }, 1000);
    } catch (err) {
      setMessage({
        type: "error",
        text: err instanceof Error ? err.message : "Failed to update tournament",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/70"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative z-10 w-full max-w-2xl mx-4 rounded-lg border bg-card p-6 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-bold">Edit Tournament</h2>
          <button
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground transition-colors"
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Name */}
          <div>
            <label className="block text-sm font-medium mb-2">Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="w-full px-4 py-2 rounded-lg bg-card border border-border text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          {/* Start Date */}
          <div>
            <label className="block text-sm font-medium mb-2">Start Date</label>
            <input
              type="datetime-local"
              value={startAt}
              onChange={(e) => setStartAt(e.target.value)}
              required
              className="w-full px-4 py-2 rounded-lg bg-card border border-border text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          {/* End Date */}
          <div>
            <label className="block text-sm font-medium mb-2">End Date</label>
            <input
              type="datetime-local"
              value={endAt}
              onChange={(e) => setEndAt(e.target.value)}
              required
              className="w-full px-4 py-2 rounded-lg bg-card border border-border text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          {/* Visibility */}
          <div>
            <label className="block text-sm font-medium mb-2">Visibility</label>
            <select
              value={visibility}
              onChange={(e) => setVisibility(e.target.value as "public" | "private")}
              className="w-full px-4 py-2 rounded-lg bg-card border border-border text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="public">Public</option>
              <option value="private">Private</option>
            </select>
          </div>

          {/* Allowed Chains */}
          <div>
            <label className="block text-sm font-medium mb-2">Allowed Chains</label>
            <div className="space-y-2">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={allowedChains.includes("EVM")}
                  onChange={(e) => handleChainChange("EVM", e.target.checked)}
                  className="rounded border-border"
                />
                <span>EVM</span>
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={allowedChains.includes("SOL")}
                  onChange={(e) => handleChainChange("SOL", e.target.checked)}
                  className="rounded border-border"
                />
                <span>Solana</span>
              </label>
            </div>
          </div>

          {/* Allowed Users */}
          <div>
            <label className="block text-sm font-medium mb-2">
              Allowed Users (comma-separated)
            </label>
            <textarea
              value={allowedUsers}
              onChange={(e) => setAllowedUsers(e.target.value)}
              rows={3}
              className="w-full px-4 py-2 rounded-lg bg-card border border-border text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              placeholder="userId1, userId2, userId3"
            />
          </div>

          {/* Allowed Crews */}
          <div>
            <label className="block text-sm font-medium mb-2">
              Allowed Crews (comma-separated)
            </label>
            <textarea
              value={allowedCrews}
              onChange={(e) => setAllowedCrews(e.target.value)}
              rows={3}
              className="w-full px-4 py-2 rounded-lg bg-card border border-border text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              placeholder="crewId1, crewId2"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium mb-2">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={4}
              className="w-full px-4 py-2 rounded-lg bg-card border border-border text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              placeholder="Tournament description..."
            />
          </div>

          {/* Tournament Rules */}
          <div>
            <label className="block text-sm font-medium mb-2">Tournament Rules</label>
            <textarea
              value={rules}
              onChange={(e) => setRules(e.target.value)}
              rows={6}
              className="w-full px-4 py-2 rounded-lg bg-card border border-border text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              placeholder="Tournament rules and guidelines..."
            />
          </div>

          {/* Message */}
          {message && (
            <div
              className={`p-3 rounded-lg ${
                message.type === "success"
                  ? "bg-[#00d57a]/20 text-[#00d57a]"
                  : "bg-[#ff4a4a]/20 text-[#ff4a4a]"
              }`}
            >
              {message.text}
            </div>
          )}

          {/* Buttons */}
          <div className="flex gap-2 justify-end">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 rounded-lg text-sm font-medium bg-secondary text-secondary-foreground hover:bg-secondary/80 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-2 rounded-lg text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? "Updating..." : "Update Tournament"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

