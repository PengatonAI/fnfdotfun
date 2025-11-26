/**
 * Normalizes chain name to standard lowercase values:
 * - "ethereum", "Ethereum", "eth", "ETH" → "evm"
 * - "solana", "Solana", "sol", "SOL" → "solana"
 * @param chain - The chain name to normalize
 * @returns Normalized chain name (lowercase: "evm" or "solana")
 * @throws Error if chain is unrecognized
 */
export function normalizeChain(chain: string | undefined): "evm" | "solana" {
  if (!chain) {
    throw new Error("Chain is required");
  }

  const normalized = chain.toString().toLowerCase().trim();

  // Map EVM chains
  if (normalized === "evm" || normalized === "ethereum" || normalized === "eth") {
    return "evm";
  }

  // Map Solana chains
  if (normalized === "solana" || normalized === "sol") {
    return "solana";
  }

  throw new Error(`Unrecognized chain: ${chain}`);
}
