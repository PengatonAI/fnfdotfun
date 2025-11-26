"use client";

import { useState } from "react";

export default function CreateTournamentForm() {
  const [name, setName] = useState("");
  const [startAt, setStartAt] = useState("");
  const [endAt, setEndAt] = useState("");
  const [visibility, setVisibility] = useState<"public" | "private">("public");
  const [allowedChains, setAllowedChains] = useState<string[]>([]);
  const [allowedUsers, setAllowedUsers] = useState("");
  const [allowedCrews, setAllowedCrews] = useState("");
  const [description, setDescription] = useState("");
  const [rules, setRules] = useState("");
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(
    null
  );
  const [isSubmitting, setIsSubmitting] = useState(false);

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
      const startAtISO = startAt ? new Date(startAt).toISOString() : "";
      const endAtISO = endAt ? new Date(endAt).toISOString() : "";

      const response = await fetch("/api/admin/seasons/create", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name,
          startAt: startAtISO,
          endAt: endAtISO,
          isTournament: true,
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
        throw new Error(data.error || "Failed to create tournament");
      }

      setMessage({ type: "success", text: "Tournament created successfully!" });
      
      // Reset form
      setName("");
      setStartAt("");
      setEndAt("");
      setVisibility("public");
      setAllowedChains([]);
      setAllowedUsers("");
      setAllowedCrews("");
      setDescription("");
      setRules("");

      // Reload page after a short delay to show updated list
      setTimeout(() => {
        window.location.reload();
      }, 1500);
    } catch (err) {
      setMessage({
        type: "error",
        text: err instanceof Error ? err.message : "Failed to create tournament",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="rounded-lg border bg-card p-6 space-y-4">
        {/* Name */}
        <div>
          <label className="block text-sm font-medium mb-2">Name</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            className="w-full px-4 py-2 rounded-lg bg-card border border-border text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
            placeholder="Tournament Name"
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
          <label className="block text-sm font-medium mb-2">Allowed Users (comma-separated)</label>
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
          <label className="block text-sm font-medium mb-2">Allowed Crews (comma-separated)</label>
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

        {/* Submit Button */}
        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full px-4 py-2 rounded-lg bg-primary text-primary-foreground font-medium hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isSubmitting ? "Creating..." : "Create Tournament"}
        </button>

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
      </div>
    </form>
  );
}

