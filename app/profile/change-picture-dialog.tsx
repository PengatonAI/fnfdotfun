"use client";

import { useState, useRef } from "react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { X, Upload, Image as ImageIcon } from "lucide-react";

interface ChangePictureDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentImage: string | null;
  onPictureUpdated: (newImageUrl: string) => void;
}

export default function ChangePictureDialog({
  open,
  onOpenChange,
  currentImage,
  onPictureUpdated,
}: ChangePictureDialogProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!open) return null;

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
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

    setError(null);
    setSelectedFile(file);

    // Create preview URL
    const reader = new FileReader();
    reader.onloadend = () => {
      setPreview(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleUpload = async () => {
    if (!selectedFile) {
      setError("Please select an image first");
      return;
    }

    setIsUploading(true);
    setError(null);

    try {
      // Step 1: Upload the file
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
      const imageUrl = uploadData.url;

      // Step 2: Update the user's profile picture
      const updateResponse = await fetch("/api/profile/update-picture", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ imageUrl }),
      });

      if (!updateResponse.ok) {
        const data = await updateResponse.json();
        throw new Error(data.error || "Failed to update profile picture");
      }

      // Success - notify parent and close dialog
      onPictureUpdated(imageUrl);
      handleClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setIsUploading(false);
    }
  };

  const handleClose = () => {
    setSelectedFile(null);
    setPreview(null);
    setError(null);
    onOpenChange(false);
  };

  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/80 backdrop-blur-sm"
        onClick={handleClose}
      />

      {/* Dialog */}
      <div className="relative z-50 w-full max-w-md rounded-2xl bg-gradient-to-br from-[#0d0d0d] via-[#111111] to-[#0a0a0a] border border-[#1a1a1a] shadow-[0_8px_40px_rgba(0,0,0,0.5)] p-6">
        {/* Close Button */}
        <button
          onClick={handleClose}
          className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-full bg-white/5 hover:bg-white/10 text-white/60 hover:text-white transition-colors"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Header */}
        <div className="mb-6">
          <h2 className="text-xl font-semibold text-white">Change Profile Picture</h2>
          <p className="text-sm text-white/40 mt-1">Upload a new profile picture</p>
        </div>

        {/* Preview Area */}
        <div className="flex flex-col items-center mb-6">
          <div className="relative group mb-4">
            {/* Glow Effect */}
            <div className="absolute -inset-1 bg-gradient-to-r from-accent/50 via-purple-500/50 to-pink-500/50 rounded-full opacity-0 group-hover:opacity-100 blur-md transition-opacity duration-300" />
            
            <div className="relative w-32 h-32 rounded-full bg-[#0a0a0a] border-2 border-[#2a2a2a] flex items-center justify-center overflow-hidden">
              {preview ? (
                <Image
                  src={preview}
                  alt="Preview"
                  fill
                  className="object-cover"
                />
              ) : currentImage ? (
                <Image
                  src={currentImage}
                  alt="Current"
                  fill
                  className="object-cover"
                />
              ) : (
                <ImageIcon className="w-12 h-12 text-white/20" />
              )}
            </div>
          </div>

          {preview && (
            <span className="text-xs text-accent">New picture preview</span>
          )}
        </div>

        {/* File Input (hidden) */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleFileSelect}
          className="hidden"
        />

        {/* Action Buttons */}
        <div className="space-y-3">
          <Button
            type="button"
            onClick={triggerFileInput}
            disabled={isUploading}
            className="w-full h-12 bg-[#0a0a0a] border border-[#2a2a2a] hover:border-accent/50 text-white transition-all duration-200 rounded-xl"
          >
            <Upload className="w-4 h-4 mr-2" />
            {selectedFile ? "Choose Different Image" : "Select Image"}
          </Button>

          {selectedFile && (
            <div className="text-sm text-white/50 text-center truncate px-4">
              Selected: {selectedFile.name}
            </div>
          )}

          {error && (
            <p className="text-sm text-[#ff4a4a] text-center">{error}</p>
          )}

          <div className="flex gap-3 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={isUploading}
              className="flex-1 h-12 border-[#2a2a2a] bg-transparent hover:bg-white/5 text-white/60 hover:text-white rounded-xl"
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleUpload}
              disabled={!selectedFile || isUploading}
              className="flex-1 h-12 bg-gradient-to-r from-[#ff4a4a]/10 via-white/10 to-[#00d57a]/10 border border-white/10 hover:border-white/20 text-white transition-all duration-200 tricolor-hover-border rounded-xl disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isUploading ? "Uploading..." : "Save Picture"}
            </Button>
          </div>
        </div>

        <p className="text-xs text-white/30 mt-4 text-center">
          Supported formats: JPG, PNG, GIF, WebP (max 5MB)
        </p>
      </div>
    </div>
  );
}
