"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import SyncStatusModal from "@/components/SyncStatusModal";

export default function SyncButton() {
  const [open, setOpen] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const handleSync = async () => {
    setOpen(true);
    setIsSyncing(true);
    setIsSuccess(false);
    setError(null);

    try {
      const response = await fetch("/api/trades/sync", {
        method: "POST",
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to sync trades");
      }

      const result = await response.json();
      
      if (result.success) {
        setIsSyncing(false);
        setIsSuccess(true);
        
        // Auto-close and refresh after 1500ms
        setTimeout(() => {
          setOpen(false);
          router.refresh();
        }, 1500);
      }
    } catch (error) {
      console.error("Error syncing trades:", error);
      setIsSyncing(false);
      setError(
        error instanceof Error ? error.message : "Sync failed — please try again"
      );
    }
  };

  return (
    <>
      <div className="flex flex-col items-end gap-2">
        <Button
          onClick={handleSync}
          disabled={isSyncing}
          variant="default"
        >
          Sync Data
        </Button>
      </div>
      <SyncStatusModal
        open={open}
        isSyncing={isSyncing}
        isSuccess={isSuccess}
        error={error}
        onClose={() => setOpen(false)}
      />
    </>
  );
}

