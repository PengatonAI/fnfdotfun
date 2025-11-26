"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";

interface User {
  id: string;
  name: string | null;
  email: string | null;
  image: string | null;
  username: string | null;
  xHandle: string | null;
}

interface CrewMember {
  id: string;
  userId: string;
  role: string;
  joinedAt: string;
  user: User;
}

interface Crew {
  id: string;
  name: string;
  description: string | null;
  openToMembers: boolean;
  avatarUrl: string | null;
  bannerUrl: string | null;
  tagline: string | null;
  bio: string | null;
  createdByUserId: string;
  createdBy: User;
  members: CrewMember[];
  createdAt: string;
  updatedAt: string;
}

interface EditCrewDialogProps {
  crew: Crew;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCrewUpdated: (crew: Crew) => void;
}

export default function EditCrewDialog({
  crew,
  open,
  onOpenChange,
  onCrewUpdated,
}: EditCrewDialogProps) {
  const [name, setName] = useState(crew.name);
  const [description, setDescription] = useState(crew.description || "");
  const [openToMembers, setOpenToMembers] = useState(crew.openToMembers);
  const [avatarUrl, setAvatarUrl] = useState(crew.avatarUrl || "");
  const [bannerUrl, setBannerUrl] = useState(crew.bannerUrl || "");
  const [tagline, setTagline] = useState(crew.tagline || "");
  const [bio, setBio] = useState(crew.bio || "");
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(crew.avatarUrl || null);

  // Update preview when crew changes
  useEffect(() => {
    if (crew.avatarUrl) {
      setAvatarPreview(crew.avatarUrl);
      setAvatarUrl(crew.avatarUrl);
    } else {
      setAvatarPreview(null);
      setAvatarUrl("");
    }
  }, [crew.avatarUrl]);

  if (!open) return null;

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith("image/")) {
      setError("Please select an image file");
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      setError("Image size must be less than 5MB");
      return;
    }

    setIsUploading(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to upload image");
      }

      const data = await response.json();
      setAvatarUrl(data.url);
      setAvatarPreview(data.url);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to upload image");
    } finally {
      setIsUploading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setError(null);

    try {
      const response = await fetch(`/api/crews/${crew.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: name.trim(),
          description: description.trim() || null,
          openToMembers: openToMembers,
          avatarUrl: avatarUrl ? avatarUrl.trim() : null,
          bannerUrl: bannerUrl.trim() || null,
          tagline: tagline.trim() || null,
          bio: bio.trim() || null,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to update crew");
      }

      const updatedCrew = await response.json();
      onCrewUpdated(updatedCrew);
      onOpenChange(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div
        className="fixed inset-0 bg-background/80 backdrop-blur-sm"
        onClick={() => onOpenChange(false)}
      />
      <div className="relative z-50 w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-lg border bg-card p-6 shadow-lg">
        <h2 className="text-xl font-semibold mb-4">Edit Crew</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="edit-name" className="block text-sm font-medium mb-2">
              Crew Name *
            </label>
            <input
              id="edit-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              maxLength={100}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            />
          </div>
          <div>
            <label
              htmlFor="edit-description"
              className="block text-sm font-medium mb-2"
            >
              Description
            </label>
            <textarea
              id="edit-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={4}
              maxLength={500}
              className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            />
          </div>
          <div>
            <label htmlFor="edit-avatarUrl" className="block text-sm font-medium mb-2">
              Crew Avatar
            </label>
            {avatarPreview && (
              <div className="mb-3 flex items-center gap-3">
                <img
                  src={avatarPreview}
                  alt="Avatar preview"
                  className="w-20 h-20 rounded-full object-cover border border-border"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setAvatarPreview(null);
                    setAvatarUrl("");
                  }}
                >
                  Remove
                </Button>
              </div>
            )}
            <input
              id="edit-avatarUrl"
              type="file"
              accept="image/*"
              onChange={handleAvatarUpload}
              disabled={isUploading}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            />
            {isUploading && (
              <p className="text-sm text-muted-foreground mt-2">Uploading image...</p>
            )}
            <p className="text-xs text-muted-foreground mt-1">
              Upload an image file (max 5MB)
            </p>
          </div>
          <div>
            <label htmlFor="edit-bannerUrl" className="block text-sm font-medium mb-2">
              Banner URL
            </label>
            <input
              id="edit-bannerUrl"
              type="url"
              value={bannerUrl}
              onChange={(e) => setBannerUrl(e.target.value)}
              placeholder="https://example.com/banner.jpg"
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            />
          </div>
          <div>
            <label htmlFor="edit-tagline" className="block text-sm font-medium mb-2">
              Tagline (max 100 characters)
            </label>
            <input
              id="edit-tagline"
              type="text"
              value={tagline}
              onChange={(e) => setTagline(e.target.value)}
              maxLength={100}
              placeholder="Short tagline for your crew"
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            />
          </div>
          <div>
            <label htmlFor="edit-bio" className="block text-sm font-medium mb-2">
              Bio
            </label>
            <textarea
              id="edit-bio"
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              rows={6}
              placeholder="Tell the story of your crew..."
              className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            />
          </div>
          <div className="flex items-center gap-2">
            <input
              id="edit-openToMembers"
              type="checkbox"
              checked={openToMembers}
              onChange={(e) => setOpenToMembers(e.target.checked)}
              className="h-4 w-4 rounded border-border"
            />
            <label htmlFor="edit-openToMembers" className="text-sm">
              Allow people to request to join
            </label>
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSaving}>
              {isSaving ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

