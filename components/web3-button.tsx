"use client";

import { useWeb3Modal } from "@web3modal/wagmi/react";
import { useAccount } from "wagmi";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { registerWallet } from "@/lib/wallets/registerWallet";

export function Web3Button() {
  const { open } = useWeb3Modal();
  const { address, isConnected, chain } = useAccount();

  // Register wallet when connected
  useEffect(() => {
    if (isConnected && address) {
      const chainName = chain?.name || "ethereum";
      registerWallet(address, chainName).catch((error) => {
        console.error("Failed to register wallet:", error);
      });
    }
  }, [isConnected, address, chain]);

  const getButtonText = () => {
    if (isConnected && address) {
      // Truncate address: 0x1234...5678
      return `${address.slice(0, 6)}...${address.slice(-4)}`;
    }
    return "Connect Wallet";
  };

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={() => open()}
    >
      {getButtonText()}
    </Button>
  );
}

