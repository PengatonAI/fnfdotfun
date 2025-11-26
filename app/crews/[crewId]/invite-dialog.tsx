"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";

interface InviteDialogProps {
  crewId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function InviteDialog({
  crewId,
  open,
  onOpenChange,
}: InviteDialogProps) {
  const [inviteLink, setInviteLink] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  if (!open) return null;

  const handleGenerateInvite = async () => {
    setIsGenerating(true);
    setError(null);
    setInviteLink(null);

    try {
      const response = await fetch(`/api/crews/${crewId}/invite`, {
        method: "POST",
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to generate invite");
      }

      const data = await response.json();
      setInviteLink(data.inviteLink);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCopy = () => {
    if (inviteLink) {
      navigator.clipboard.writeText(inviteLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div
        className="fixed inset-0 bg-background/80 backdrop-blur-sm"
        onClick={() => onOpenChange(false)}
      />
      <div className="relative z-50 w-full max-w-md rounded-lg border bg-card p-6 shadow-lg">
        <h2 className="text-xl font-semibold mb-4">Invite Members</h2>

        {!inviteLink ? (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Generate an invite link to share with others. The link will expire in 48 hours.
            </p>
            {error && (
              <p className="text-sm text-destructive">{error}</p>
            )}
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Cancel
              </Button>
              <Button onClick={handleGenerateInvite} disabled={isGenerating}>
                {isGenerating ? "Generating..." : "Generate Invite Link"}
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">
                Invite Link
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={inviteLink}
                  readOnly
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 font-mono text-xs"
                />
                <Button onClick={handleCopy} variant="outline" size="sm">
                  {copied ? "Copied!" : "Copy"}
                </Button>
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              Share this link with others to invite them to your crew. The link expires in 48 hours.
            </p>
            <div className="flex justify-end">
              <Button onClick={() => onOpenChange(false)}>
                Done
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

