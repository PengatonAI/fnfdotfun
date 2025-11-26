'use client';

import { useEffect } from 'react';
import { useAccount } from 'wagmi';

export function WalletRegistrar() {
  const { address, isConnected } = useAccount();

  useEffect(() => {
    if (isConnected && address) {
      fetch("/api/wallets/connect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          address: address,
          chain: "evm",
        }),
      }).catch((error) => {
        console.error('Failed to register EVM wallet:', error);
      });
    }
  }, [isConnected, address]);

  return null;
}
