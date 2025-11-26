"use client";

import { useState, useRef } from "react";
import { createPortal } from "react-dom";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { X, Upload, Image as ImageIcon, User, FileText, MessageSquare } from "lucide-react";

interface EditProfileModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentImage: string | null;
  currentUsername: string | null;
  currentBio: string;
  currentTagline: string;
  hasGoogle: boolean;
  hasTwitter: boolean;
  onProfileUpdated: (data: {
    image?: string;
    username?: string;
    bio?: string;
    tagline?: string;
  }) => void;
}

export default function EditProfileModal({
  open,
  onOpenChange,
  currentImage,
  currentUsername,
  currentBio,
  currentTagline,
  hasGoogle,
  hasTwitter,
  onProfileUpdated,
}: EditProfileModalProps) {
  const [username, setUsername] = useState(currentUsername || "");
  const [bio, setBio] = useState(currentBio);
  const [tagline, setTagline] = useState(currentTagline);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isResettingAvatar, setIsResettingAvatar] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!open) return null;

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setError("Please select an image file");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setError("Image size must be less than 5MB");
      return;
    }

    setError(null);
    setSelectedFile(file);

    const reader = new FileReader();
    reader.onloadend = () => {
      setPreview(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleResetAvatar = async () => {
    setIsResettingAvatar(true);
    setError(null);

    try {
      const response = await fetch("/api/profile/reset-avatar", {
        method: "POST",
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to reset avatar");
      }

      const data = await response.json();
      onProfileUpdated({ image: data.user.image });
      setPreview(null);
      setSelectedFile(null);
      setSuccess("Avatar reset successfully!");
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setIsResettingAvatar(false);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    setError(null);
    setSuccess(null);

    try {
      let newImageUrl: string | undefined;

      // Upload new image if selected
      if (selectedFile) {
        const formData = new FormData();
        formData.append("file", selectedFile);

        const uploadResponse = await fetch("/api/profile/upload-picture", {
          method: "POST",
          body: formData,
        });

        if (!uploadResponse.ok) {
          const data = await uploadResponse.json();
          throw new Error(data.error || "Failed to upload image");
        }

        const uploadData = await uploadResponse.json();
        newImageUrl = uploadData.url;

        // Update the user's profile picture
        const updateResponse = await fetch("/api/profile/update-picture", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ imageUrl: newImageUrl }),
        });

        if (!updateResponse.ok) {
          const data = await updateResponse.json();
          throw new Error(data.error || "Failed to update profile picture");
        }
      }

      // Update username if changed
      if (username.trim() !== (currentUsername || "")) {
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
      }

      // Notify parent of all updates
      onProfileUpdated({
        image: newImageUrl,
        username: username.trim() || undefined,
        bio,
        tagline,
      });

      setSuccess("Profile updated successfully!");
      setTimeout(() => {
        handleClose();
      }, 1000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setIsSaving(false);
    }
  };

  const handleClose = () => {
    setSelectedFile(null);
    setPreview(null);
    setError(null);
    setSuccess(null);
    onOpenChange(false);
  };

  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  const getUserInitial = () => {
    if (currentUsername) return currentUsername[0].toUpperCase();
    return "?";
  };

  const displayImage = preview || currentImage;

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
          <div className="absolute -bottom-24 -left-24 w-48 h-48 bg-gradient-to-tr from-emerald-500/10 to-transparent rounded-full blur-3xl" />
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
            <h2 className="text-xl font-semibold text-white">Edit Profile</h2>
            <p className="text-sm text-white/40 mt-1">Update your public identity</p>
          </div>

          {/* Profile Picture Section */}
          <div className="flex flex-col items-center mb-6">
            <div className="relative group mb-4">
              <div className="absolute -inset-1 bg-gradient-to-r from-[#ff4a4a]/50 via-white/30 to-[#00d57a]/50 rounded-full opacity-0 group-hover:opacity-100 blur-md transition-opacity duration-300" />
              
              <div className="relative w-28 h-28 rounded-full bg-[#0a0a0a] border-2 border-[#2a2a2a] flex items-center justify-center overflow-hidden">
                {displayImage ? (
                  <Image
                    src={displayImage}
                    alt="Profile"
                    fill
                    className="object-cover"
                  />
                ) : (
                  <span className="text-3xl font-bold text-white/40">
                    {getUserInitial()}
                  </span>
                )}
              </div>
            </div>

            {preview && (
              <span className="text-xs text-accent mb-2">New picture preview</span>
            )}

            {/* File Input (hidden) */}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileSelect}
              className="hidden"
            />

            {/* Picture Buttons */}
            <div className="flex gap-2">
              <Button
                type="button"
                onClick={triggerFileInput}
                disabled={isSaving}
                className="h-9 px-4 bg-[#0a0a0a] border border-[#2a2a2a] text-white text-sm rounded-lg tricolor-hover-border"
              >
                <Upload className="w-3.5 h-3.5 mr-2" />
                {selectedFile ? "Change" : "Upload"}
              </Button>
              {(hasGoogle || hasTwitter) && (
                <Button
                  type="button"
                  onClick={handleResetAvatar}
                  disabled={isResettingAvatar || isSaving}
                  className="h-9 px-4 bg-transparent border border-[#2a2a2a] text-white/60 hover:text-white text-sm rounded-lg hover:bg-white/5"
                >
                  {isResettingAvatar ? "..." : "Reset"}
                </Button>
              )}
            </div>
          </div>

          {/* Form Fields */}
          <div className="space-y-4">
            {/* Username */}
            <div>
              <label htmlFor="edit-username" className="flex items-center gap-2 text-sm font-medium text-white/80 mb-2">
                <User className="w-4 h-4 text-white/40" />
                Username
              </label>
              <input
                id="edit-username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                minLength={3}
                maxLength={20}
                pattern="[a-zA-Z0-9_]{3,20}"
                placeholder="Enter username"
                className="w-full h-11 rounded-xl border border-[#2a2a2a] bg-[#0a0a0a] px-4 text-white placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-accent/50 focus:border-accent/50 transition-all"
              />
              <p className="text-xs text-white/30 mt-1.5">3-20 characters, alphanumeric and underscores only</p>
            </div>

            {/* Tagline */}
            <div>
              <label htmlFor="edit-tagline" className="flex items-center gap-2 text-sm font-medium text-white/80 mb-2">
                <MessageSquare className="w-4 h-4 text-white/40" />
                Tagline <span className="text-white/30 font-normal">(optional)</span>
              </label>
              <input
                id="edit-tagline"
                type="text"
                value={tagline}
                onChange={(e) => setTagline(e.target.value)}
                maxLength={50}
                placeholder="Ready to dominate the markets"
                className="w-full h-11 rounded-xl border border-[#2a2a2a] bg-[#0a0a0a] px-4 text-white placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-accent/50 focus:border-accent/50 transition-all"
              />
            </div>

            {/* Bio */}
            <div>
              <label htmlFor="edit-bio" className="flex items-center gap-2 text-sm font-medium text-white/80 mb-2">
                <FileText className="w-4 h-4 text-white/40" />
                Bio <span className="text-white/30 font-normal">(optional)</span>
              </label>
              <textarea
                id="edit-bio"
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                placeholder="Tell us about yourself..."
                rows={3}
                className="w-full rounded-xl border border-[#2a2a2a] bg-[#0a0a0a] px-4 py-3 text-white placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-accent/50 focus:border-accent/50 transition-all resize-none"
              />
            </div>
          </div>

          {/* Status Messages */}
          {error && (
            <p className="text-sm text-[#ff4a4a] mt-4 text-center">{error}</p>
          )}
          {success && (
            <p className="text-sm text-[#00d57a] mt-4 text-center">{success}</p>
          )}

          {/* Action Buttons */}
          <div className="flex gap-3 mt-6">
            <Button
              type="button"
              onClick={handleClose}
              disabled={isSaving}
              className="flex-1 h-11 bg-transparent border border-[#2a2a2a] text-white/60 hover:text-white rounded-xl hover:bg-white/5"
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={handleSave}
              disabled={isSaving}
              className="flex-1 h-11 bg-[#0a0a0a] border-white/10 hover:bg-transparent text-white rounded-xl tricolor-hover-border disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSaving ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}

