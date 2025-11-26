'use client';

import { createWeb3Modal, defaultWagmiConfig } from '@web3modal/wagmi/react';
import { mainnet, polygon, arbitrum } from 'wagmi/chains';

const projectId = process.env.NEXT_PUBLIC_WALLETCONNECT_ID || '';

if (!projectId) {
  console.warn('NEXT_PUBLIC_WALLETCONNECT_ID is not set. Please set it in your .env.local file.');
}

// --- EVM Config ---
const chains = [mainnet, polygon, arbitrum] as const;

export const wagmiConfig = defaultWagmiConfig({
  chains,
  projectId,
  metadata: {
    name: 'FNF Dot Fun',
    description: 'FNF Dot Fun Application',
    url: typeof window !== 'undefined' ? window.location.origin : '',
    icons: [],
  },
});

// --- Initialize Modal (only on client side) ---
if (typeof window !== 'undefined') {
  createWeb3Modal({
    wagmiConfig,
    projectId,
    enableAnalytics: false,
    themeMode: 'dark',
    themeVariables: {
      '--w3m-z-index': 9999,
    },
  });
}
