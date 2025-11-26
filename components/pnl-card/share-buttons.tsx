"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";

interface ShareButtonsProps {
  mode: "user" | "crew";
  crewId?: string;
  settings: {
    theme: string;
    backgroundColor: string;
    accentColor: string;
    showAvatar: boolean;
    showUsername: boolean;
    showPnl: boolean;
    showVolume: boolean;
    showWinRate: boolean;
    showTotalTrades: boolean;
    font?: string;
    frame?: string;
    badges?: string[];
  };
  stats: any;
  range: string;
}

export default function ShareButtons({
  mode,
  crewId,
  settings,
  stats,
  range,
}: ShareButtonsProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [generatedCardId, setGeneratedCardId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);

  const handleShare = async () => {
    setIsModalOpen(true);
    setIsLoading(true);
    setError(null);
    setShareUrl(null);
    setGeneratedCardId(null);
    setImageLoaded(false);

    try {
      const res = await fetch("/api/pnl-card/share", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          type: mode,
          crewId: mode === "crew" ? crewId : undefined,
          settings,
          stats,
          range,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to create share link");
      }

      const url = `${window.location.origin}/pnl-card/${data.cardId}`;
      setShareUrl(url);
      setGeneratedCardId(data.cardId);
    } catch (err) {
      console.error("Error sharing card:", err);
      setError(err instanceof Error ? err.message : "Failed to create share link");
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopy = async () => {
    if (!shareUrl) return;
    
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  };

  const handleDownload = () => {
    if (!generatedCardId) return;
    window.open(`/pnl-card/${generatedCardId}/download`, "_blank");
  };

  const handleClose = () => {
    setIsModalOpen(false);
    setShareUrl(null);
    setGeneratedCardId(null);
    setError(null);
    setCopied(false);
    setImageLoaded(false);
  };

  return (
    <>
      {/* Share Button - Tricolor theme */}
      <button
        onClick={handleShare}
        className="relative w-full py-3.5 px-4 rounded-xl font-semibold transition-all duration-150 ease-out bg-neutral-900 border border-neutral-700 text-white hover:scale-[1.01] active:scale-[0.99] flex items-center justify-center gap-2.5 tricolor-hover-border"
      >
        <svg
          className="w-5 h-5 relative z-10"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z"
          />
        </svg>
        <span className="relative z-10">Share Card</span>
      </button>

      {/* Modal Backdrop */}
      {isModalOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4"
          onClick={handleClose}
        >
          {/* Modal Content */}
          <div
            className="bg-neutral-900/95 border border-neutral-800/70 rounded-2xl w-full max-w-lg p-6 shadow-[0_0_60px_rgba(0,0,0,0.8)] max-h-[90vh] overflow-y-auto space-y-5"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold text-neutral-100 tracking-wide">
                Share Your PnL Card
              </h2>
              <button
                onClick={handleClose}
                className="text-neutral-400 hover:text-white transition-colors duration-150 p-1 hover:bg-neutral-800 rounded-lg"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Loading State */}
            {isLoading && (
              <div className="flex flex-col items-center justify-center py-14">
                <div className="w-12 h-12 border-4 border-cyan-500/30 border-t-cyan-500 rounded-full animate-spin mb-5" />
                <p className="text-neutral-400 text-sm">Generating share link…</p>
              </div>
            )}

            {/* Error State */}
            {error && !isLoading && (
              <div className="text-center py-10">
                <div className="text-red-400 mb-5">
                  <svg className="w-14 h-14 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <p className="text-red-400 mb-5 text-sm">{error}</p>
                <button
                  onClick={handleShare}
                  className="px-5 py-2.5 bg-neutral-800 hover:bg-neutral-700 rounded-lg text-white transition-all duration-150 text-sm font-medium"
                >
                  Try Again
                </button>
              </div>
            )}

            {/* Success State */}
            {shareUrl && !isLoading && (
              <div className="space-y-5">
                {/* OG Image Preview */}
                <div className="w-full flex justify-center">
                  <div className="relative w-full rounded-xl overflow-hidden">
                    {/* Loading skeleton - shown until image loads */}
                    {!imageLoaded && (
                      <div
                        className="animate-pulse bg-neutral-800 rounded-xl border border-neutral-700/50"
                        style={{
                          width: "100%",
                          aspectRatio: "1200/630",
                        }}
                      />
                    )}
                    {/* Actual OG Image */}
                    {generatedCardId && (
                      /* eslint-disable-next-line @next/next/no-img-element */
                      <img
                        src={`/pnl-card/${generatedCardId}/opengraph-image`}
                        alt="PnL Card Preview"
                        className={cn(
                          "w-full rounded-xl border-2 border-cyan-500/40 shadow-[0_0_25px_rgba(6,182,212,0.25)] transition-opacity duration-300",
                          imageLoaded ? "opacity-100" : "opacity-0 absolute inset-0"
                        )}
                        style={{
                          aspectRatio: "1200/630",
                          objectFit: "cover",
                        }}
                        onLoad={() => setImageLoaded(true)}
                      />
                    )}
                  </div>
                </div>

                {/* URL Input */}
                <div className="space-y-2">
                  <label className="text-sm text-neutral-400 font-medium">Share Link</label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={shareUrl}
                      readOnly
                      className="flex-1 px-3.5 py-2.5 bg-neutral-800/80 border border-neutral-700/60 rounded-lg text-white text-sm font-mono truncate focus:outline-none focus:border-cyan-500/50"
                    />
                    <button
                      onClick={handleCopy}
                      className={cn(
                        "px-4 py-2.5 rounded-lg font-semibold transition-all duration-150 text-sm",
                        copied
                          ? "bg-green-600 text-white shadow-[0_0_15px_rgba(34,197,94,0.4)]"
                          : "bg-cyan-600 hover:bg-cyan-500 text-white shadow-[0_0_15px_rgba(6,182,212,0.35)] hover:shadow-[0_0_20px_rgba(6,182,212,0.5)]"
                      )}
                    >
                      {copied ? "Copied!" : "Copy"}
                    </button>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-3 pt-1">
                  <a
                    href={shareUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 py-2.5 px-4 bg-neutral-800 hover:bg-neutral-700 border border-neutral-700/60 rounded-lg text-white text-center font-medium transition-all duration-150 flex items-center justify-center gap-2 text-sm"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                    </svg>
                    Open Card
                  </a>
                  <button
                    onClick={handleDownload}
                    className="flex-1 py-2.5 px-4 bg-cyan-600 hover:bg-cyan-500 text-white font-semibold rounded-lg transition-all duration-150 shadow-[0_0_15px_rgba(6,182,212,0.35)] hover:shadow-[0_0_25px_rgba(6,182,212,0.55)] flex items-center justify-center gap-2 text-sm"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                    </svg>
                    Download
                  </button>
                </div>

                {/* Social share hint */}
                <p className="text-xs text-neutral-500 text-center pt-1">
                  Share this link on X/Twitter for a beautiful preview card
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
