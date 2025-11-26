/**
 * Pricing provider interface for fetching current and historical token prices.
 * Implementations will fetch prices from external APIs (CryptoCompare, DexScreener, etc.)
 */
export interface PricingProvider {
  /**
   * Get the current USD price of a token.
   * @param tokenAddress - Token contract address (null for native tokens)
   * @param chain - Chain identifier (e.g., "ethereum", "solana")
   * @returns Current USD price, or null if unavailable
   */
  getCurrentPrice(tokenAddress: string | null, chain: string): Promise<number | null>;

  /**
   * Get the historical USD price of a token at a specific timestamp.
   * @param tokenAddress - Token contract address (null for native tokens)
   * @param chain - Chain identifier (e.g., "ethereum", "solana")
   * @param timestamp - Date when the price should be fetched
   * @returns Historical USD price, or null if unavailable
   */
  getHistoricalPrice(tokenAddress: string | null, chain: string, timestamp: Date): Promise<number | null>;
}

