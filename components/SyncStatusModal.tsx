"use client";

import { useEffect, useState, useRef } from "react";
import { Loader2, CheckCircle2, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

interface SyncStatusModalProps {
  open: boolean;
  isSyncing: boolean;
  isSuccess: boolean;
  error: string | null;
  onClose: () => void;
}

interface SyncStatus {
  stage: string;
  current: number;
  total: number;
  message: string;
  updatedAt: number;
  done: boolean;
  error?: string;
}

export default function SyncStatusModal({
  open,
  isSyncing,
  isSuccess,
  error,
  onClose,
}: SyncStatusModalProps) {
  const [progressStatus, setProgressStatus] = useState<SyncStatus | null>(null);
  const [isConfirmingState, setIsConfirmingState] = useState(false);
  const [displayStage, setDisplayStage] = useState<string>("");
  const lastProgressRef = useRef<number | null>(null);

  // Poll progress endpoint every 500ms when syncing
  useEffect(() => {
    if (!open || !isSyncing) {
      setProgressStatus(null);
      setIsConfirmingState(false);
      setDisplayStage("");
      lastProgressRef.current = null;
      return;
    }

    const pollProgress = async () => {
      try {
        const response = await fetch("/api/trades/sync-status");
        if (response.ok) {
          const status: SyncStatus = await response.json();
          setProgressStatus(status);
        }
      } catch (error) {
        // Silently fail - don't break UI if polling fails
        console.error("Error polling sync status:", error);
      }
    };

    // Poll immediately, then every 500ms
    pollProgress();
    const interval = setInterval(pollProgress, 500);

    return () => clearInterval(interval);
  }, [open, isSyncing]);

  // Detect cycle reset to identify second loop (confirming phase)
  useEffect(() => {
    if (!progressStatus || !progressStatus.total) {
      return;
    }

    const current = progressStatus.current;
    const total = progressStatus.total;
    const lastProgress = lastProgressRef.current;

    // Detect cycle reset: current === 1 AND lastProgress === total
    // This indicates we've completed the first loop and started the second loop
    if (current === 1 && lastProgress !== null && lastProgress === total) {
      setIsConfirmingState(true);
    }

    // Reset confirming state when sync is done
    if (progressStatus.done) {
      setIsConfirmingState(false);
    }

    // Update ref with current progress value
    lastProgressRef.current = current;
  }, [progressStatus]);

  // Auto-close on success after 1.5s
  useEffect(() => {
    if (open && !isSyncing && isSuccess && !error) {
      const timer = setTimeout(() => {
        onClose();
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [open, isSyncing, isSuccess, error, onClose]);

  // Debounce stage updates to prevent flickering
  // Must be before conditional return to maintain consistent hook order
  const stage = progressStatus?.stage || "";
  useEffect(() => {
    if (!stage) return;

    const t = setTimeout(() => {
      setDisplayStage(stage);
    }, 300);

    return () => clearTimeout(t);
  }, [stage]);

  if (!open) return null;

  // Use backend progress status if available, otherwise fall back to frontend state
  const displayError = progressStatus?.error || error;
  const displayDone = progressStatus?.done || (!isSyncing && isSuccess);
  const displaySyncing = isSyncing && !displayDone && !displayError;

  // Calculate progress percentage
  const progressPercent = progressStatus && progressStatus.total > 0
    ? Math.round((progressStatus.current / progressStatus.total) * 100)
    : 0;

  // Improved detection of "second pass" (confirming phase) using regex
  const message = progressStatus?.message || "";
  const isConfirming = /saving|persist|saving-trades|saving trades|saving to database|db/i.test(
    (displayStage || message || "")
  ) || isConfirmingState;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Background */}
      <div
        className="fixed inset-0 bg-background/80 backdrop-blur-sm"
        onClick={error ? onClose : undefined}
      />

      {/* Modal Content */}
      <div className="relative z-50 w-full max-w-md rounded-lg border bg-card p-6 shadow-lg">
        {/* Loading state */}
        {displaySyncing && (
          <div className="flex flex-col items-center gap-4 text-center">
            <Loader2 className="h-12 w-12 animate-spin text-primary" />
            <div className="w-full">
              <h2 className="text-xl font-semibold mb-2">Syncing wallet</h2>
              
              {/* Progress info when backend provides data */}
              {progressStatus && progressStatus.total > 0 && (
                <div className="w-full space-y-2 mb-2">
                  <p className="text-sm text-muted-foreground">
                    {isConfirming
                      ? `Finalizing trade ${progressStatus.current}/${progressStatus.total}…`
                      : `Analyzing trade ${progressStatus.current}/${progressStatus.total}…`
                    }
                  </p>
                  <div className="w-full">
                    <div className="flex justify-between text-xs text-muted-foreground mb-1">
                      <span>{progressStatus.current} / {progressStatus.total}</span>
                      <span>{progressPercent}%</span>
                    </div>
                    <div className="w-full bg-secondary rounded-full h-2">
                      <div
                        className="bg-primary h-2 rounded-full transition-all duration-300"
                        style={{ width: `${progressPercent}%` }}
                      />
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {isConfirming
                      ? "Saving trades securely…"
                      : "Collecting transaction history…"
                    }
                  </p>
                </div>
              )}
              
              {/* Fallback message when no progress data yet */}
              {(!progressStatus || progressStatus.total === 0) && (
                <p className="text-sm text-muted-foreground">
                  Collecting and analyzing your on-chain trades. This may take up to 60 seconds.
                </p>
              )}
            </div>
          </div>
        )}

        {/* Success state */}
        {displayDone && !displayError && (
          <div className="flex flex-col items-center gap-4 text-center">
            <CheckCircle2 className="h-12 w-12 text-[#00d57a]" />
            <div>
              <h2 className="text-xl font-semibold mb-2">Sync complete!</h2>
              <p className="text-sm text-muted-foreground">
                Your trades have been successfully synced.
              </p>
            </div>
          </div>
        )}

        {/* Error state */}
        {displayError && (
          <div className="flex flex-col items-center gap-4 text-center">
            <XCircle className="h-12 w-12 text-destructive" />
            <div>
              <h2 className="text-xl font-semibold mb-2">Sync failed</h2>
              <p className="text-sm text-muted-foreground mb-4">{displayError}</p>
            </div>
            <Button onClick={onClose} variant="default">
              Close
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

