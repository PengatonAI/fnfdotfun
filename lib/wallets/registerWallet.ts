"use client";

/**
 * Register a wallet connection with the backend
 * Detects EVM or Solana and calls the connect API
 */
export async function registerWallet(
  address: string,
  chain?: string
): Promise<any> {
  try {
    // Auto-detect chain if not provided
    let detectedChain = chain;

    if (!detectedChain) {
      const normalizedAddress = address.trim().toLowerCase();
      
      // EVM addresses start with 0x and are 42 characters
      if (normalizedAddress.startsWith("0x") && normalizedAddress.length === 42) {
        detectedChain = "evm";
      } else {
        // Assume Solana for other address formats
        detectedChain = "solana";
      }
    }

    const response = await fetch("/api/wallets/connect", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        address: address.trim(),
        chain: detectedChain,
      }),
    });

    if (!response.ok) {
      const data = await response.json();
      throw new Error(data.error || "Failed to register wallet");
    }

    const wallet = await response.json();
    return wallet;
  } catch (error) {
    console.error("Error registering wallet:", error);
    throw error;
  }
}

