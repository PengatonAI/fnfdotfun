"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import AddWalletDialog from "./add-wallet-dialog";
import { useRouter } from "next/navigation";

interface Wallet {
  id: string;
  address: string;
  chain: string;
  label: string | null;
  verified: boolean;
  createdAt: string;
  updatedAt: string;
}

export default function WalletsSection() {
  const [wallets, setWallets] = useState<Wallet[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const router = useRouter();

  const fetchWallets = async () => {
    try {
      const response = await fetch("/api/wallets");
      if (response.ok) {
        const data = await response.json();
        setWallets(data);
      }
    } catch (error) {
      console.error("Error fetching wallets:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchWallets();
  }, []);

  const handleDelete = async (walletId: string) => {
    if (!confirm("Are you sure you want to remove this wallet?")) {
      return;
    }

    setDeletingId(walletId);
    try {
      const response = await fetch(`/api/wallets/${walletId}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to delete wallet");
      }

      setWallets(wallets.filter((w) => w.id !== walletId));
      router.refresh();
    } catch (error) {
      alert(error instanceof Error ? error.message : "An error occurred");
    } finally {
      setDeletingId(null);
    }
  };


  const formatAddress = (address: string) => {
    if (address.length > 20) {
      return `${address.slice(0, 6)}...${address.slice(-4)}`;
    }
    return address;
  };

  const getChainBadgeColor = (chain: string) => {
    const chainLower = chain.toLowerCase();
    switch (chainLower) {
      case "solana":
        return "bg-muted text-muted-foreground";
      case "ethereum":
      case "evm":
        return "bg-muted text-muted-foreground";
      case "arbitrum":
        return "bg-muted text-muted-foreground";
      case "polygon":
        return "bg-muted text-muted-foreground";
      case "base":
        return "bg-muted text-muted-foreground";
      case "optimism":
        return "bg-muted text-muted-foreground";
      case "bnb":
      case "bsc":
        return "bg-muted text-muted-foreground";
      default:
        return "bg-muted text-muted-foreground";
    }
  };

  return (
    <>
      <div className="rounded-lg border p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold">Connected Wallets</h2>
          <Button onClick={() => setShowAddDialog(true)}>Add Wallet</Button>
        </div>

        {isLoading ? (
          <p className="text-sm text-muted-foreground">Loading wallets...</p>
        ) : wallets.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-sm text-muted-foreground mb-4">
              No wallets connected yet
            </p>
            <Button onClick={() => setShowAddDialog(true)} variant="outline">
              Add Your First Wallet
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            {wallets.map((wallet) => (
              <div
                key={wallet.id}
                className="flex items-center justify-between p-4 rounded-md border bg-card hover:bg-muted/50 transition-colors"
              >
                <div className="flex-1 space-y-1">
                  <div className="flex items-center gap-2">
                    <span
                      className={`px-2 py-1 text-xs font-medium rounded ${getChainBadgeColor(
                        wallet.chain
                      )}`}
                    >
                      {wallet.chain.toLowerCase() === "solana" ? "SOL" : "EVM"}
                    </span>
                    {wallet.label && (
                      <span className="text-sm font-medium">{wallet.label}</span>
                    )}
                  </div>
                  <p className="text-sm font-mono text-muted-foreground">
                    {formatAddress(wallet.address)}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Added {new Date(wallet.createdAt).toLocaleDateString()}
                    {wallet.verified && (
                      <span className="ml-2 text-[#00d57a]">
                        ✓ Verified
                      </span>
                    )}
                  </p>
                </div>
                <div className="flex gap-2 ml-4">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDelete(wallet.id)}
                    disabled={deletingId === wallet.id}
                  >
                    {deletingId === wallet.id ? "Deleting..." : "Delete"}
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <AddWalletDialog
        open={showAddDialog}
        onOpenChange={setShowAddDialog}
        onWalletAdded={fetchWallets}
      />
    </>
  );
}

