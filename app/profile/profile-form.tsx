"use client";

import { useState } from "react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import ChangePictureDialog from "./change-picture-dialog";

interface User {
  id: string;
  name: string | null;
  email: string | null;
  image: string | null;
  username: string | null;
  xHandle: string | null;
  accounts: { provider: string }[];
}

interface ProfileFormProps {
  user: User;
}

export default function ProfileForm({ user: initialUser }: ProfileFormProps) {
  const [user, setUser] = useState(initialUser);
  const [username, setUsername] = useState(user.username || "");
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [showChangePictureDialog, setShowChangePictureDialog] = useState(false);
  const [isResettingAvatar, setIsResettingAvatar] = useState(false);
  const [pictureSuccess, setPictureSuccess] = useState<string | null>(null);
  const router = useRouter();

  const hasGoogle = user.accounts.some((acc) => acc.provider === "google");
  const hasTwitter = user.accounts.some((acc) => acc.provider === "twitter");

  const handleUpdateUsername = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setError(null);
    setSuccess(false);

    try {
      const response = await fetch("/api/profile", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ username: username.trim() || null }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to update username");
      }

      const updatedUser = await response.json();
      setUser({ ...user, username: updatedUser.username });
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setIsSaving(false);
    }
  };

  const handlePictureUpdated = (newImageUrl: string) => {
    setUser({ ...user, image: newImageUrl });
    setPictureSuccess("Profile picture updated successfully!");
    setTimeout(() => setPictureSuccess(null), 3000);
    router.refresh();
  };

  const handleResetAvatar = async () => {
    setIsResettingAvatar(true);
    setError(null);
    setPictureSuccess(null);

    try {
      const response = await fetch("/api/profile/reset-avatar", {
        method: "POST",
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to reset avatar");
      }

      const data = await response.json();
      setUser({ ...user, image: data.user.image });
      setPictureSuccess(data.message || "Profile picture reset successfully!");
      setTimeout(() => setPictureSuccess(null), 3000);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setIsResettingAvatar(false);
    }
  };

  // Get user initial for fallback avatar
  const getUserInitial = () => {
    if (user.username) return user.username[0].toUpperCase();
    if (user.name) return user.name[0].toUpperCase();
    if (user.email) return user.email[0].toUpperCase();
    return "?";
  };

  return (
    <div className="space-y-8">
      {/* Public Identity Section */}
      <div className="rounded-xl border border-border bg-card p-6">
        <h2 className="text-xl font-semibold mb-6">Public Identity</h2>
        
        {/* Profile Picture Section */}
        <div className="mb-6">
          <label className="block text-sm font-medium mb-3">Profile Picture</label>
          <div className="flex items-center gap-4">
            <div className="relative w-20 h-20 rounded-full bg-muted border border-border flex items-center justify-center overflow-hidden">
              {user.image ? (
                <Image
                  src={user.image}
                  alt="Profile"
                  fill
                  className="rounded-full object-cover"
                />
              ) : (
                <div className="text-2xl font-semibold text-muted-foreground">
                  {getUserInitial()}
                </div>
              )}
            </div>
            <div className="flex flex-col gap-2">
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setShowChangePictureDialog(true)}
                >
                  Change Picture
                </Button>
                {(hasGoogle || hasTwitter) && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={handleResetAvatar}
                    disabled={isResettingAvatar}
                  >
                    {isResettingAvatar ? "Resetting..." : "Reset to Platform Avatar"}
                  </Button>
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                Upload a custom picture or use your {hasTwitter ? "X/Twitter" : hasGoogle ? "Google" : "platform"} avatar
              </p>
              {pictureSuccess && (
                <p className="text-sm text-[#00d57a]">{pictureSuccess}</p>
              )}
            </div>
          </div>
        </div>

        <form onSubmit={handleUpdateUsername} className="space-y-4">
          <div>
            <label htmlFor="username" className="block text-sm font-medium mb-2">
              Platform Username *
            </label>
            <p className="text-xs text-muted-foreground mb-4">
              This is your public identity. Must be 3-20 characters, alphanumeric and underscores only.
            </p>
            <div className="flex gap-3 items-start">
              <input
                id="username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                minLength={3}
                maxLength={20}
                pattern="[a-zA-Z0-9_]{3,20}"
                placeholder="Enter username"
                className="flex-1 h-10 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              />
              <Button 
                type="submit" 
                disabled={isSaving || username === user.username}
                className="shrink-0"
              >
                {isSaving ? "Saving..." : "Save"}
              </Button>
            </div>
            {error && <p className="text-sm text-destructive mt-2">{error}</p>}
            {success && (
              <p className="text-sm text-[#00d57a] mt-2">
                Username updated successfully!
              </p>
            )}
            {user.xHandle && (
              <p className="text-sm text-muted-foreground mt-2">
                Your X handle: @{user.xHandle}
              </p>
            )}
          </div>
        </form>
      </div>

      {/* PnL Card Section */}
      <div className="rounded-xl border border-border bg-card p-6">
        <h2 className="text-xl font-semibold mb-4">PnL Card</h2>
        <p className="text-sm text-muted-foreground mb-4">
          Create and customize your shareable PnL trading card.
        </p>
        <Button asChild variant="outline">
          <a href="/pnl-card">Customize PnL Card</a>
        </Button>
      </div>

      {/* Trade History Section */}
      <div className="rounded-xl border border-border bg-card p-6">
        <h2 className="text-xl font-semibold mb-4">Trade History</h2>
        <p className="text-sm text-muted-foreground mb-4">
          View and manage your trade history across all connected wallets.
        </p>
        <Button asChild variant="outline">
          <a href="/profile/trades">View All Trades</a>
        </Button>
      </div>

      {/* Change Picture Dialog */}
      <ChangePictureDialog
        open={showChangePictureDialog}
        onOpenChange={setShowChangePictureDialog}
        currentImage={user.image}
        onPictureUpdated={handlePictureUpdated}
      />
    </div>
  );
}
