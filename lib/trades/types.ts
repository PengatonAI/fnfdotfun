/**
 * Canonical trade input interface matching the Trade model
 * (minus ids, createdAt, updatedAt)
 */
export interface CanonicalTradeInput {
  userId: string;
  walletId: string;
  walletAddress: string;
  chain: "evm" | "solana";
  platform: string; // e.g. "uniswap", "jupiter", "meteora", "unknown"
  direction: "BUY" | "SELL";
  // Legacy fields (kept for backward compatibility, but not used in new DB writes)
  baseTokenAddress: string;
  quoteTokenAddress: string;
  baseAmount: string; // Raw amount as string
  quoteAmount: string; // Raw amount as string
  // New parsed fields (these are what we use)
  price: number | null; // normalizedIn / normalizedOut, null if can't compute
  nativePrice?: number | null; // USD price of chain's native token (ETH, SOL) at trade time
  usdPricePerToken?: number | null; // Calculated USD price per token at trade time (for proof system)
  usdValue?: number | null; // Calculated total USD value of the trade (for proof system)
  tokenInSymbol: string | null; // Symbol of token going in
  tokenOutSymbol: string | null; // Symbol of token going out
  tokenNameIn: string | null; // Name of token going in
  tokenNameOut: string | null; // Name of token going out
  normalizedAmountIn: number | null; // Normalized decimal amount going in
  normalizedAmountOut: number | null; // Normalized decimal amount going out
  decimalsIn: number | null; // Decimals of token going in
  decimalsOut: number | null; // Decimals of token going out
  tokenInAddress?: string; // Address of token going in (new field)
  tokenOutAddress?: string; // Address of token going out (new field)
  feeAmount: string | null;
  feeTokenAddress: string | null;
  txHash: string;
  txIndex: number | null; // For EVM logs
  timestamp: Date;
  raw: any; // Raw indexer payload (will be JSON stringified)
}

export interface SyncParams {
  userId: string;
  walletAddress: string;
  lastSyncedCursor: string | null;
}

export interface SyncResult {
  newTrades: number; // Number of swaps detected
  transfersFetched: number; // Total unique transfers fetched
  lastSyncedCursor: string | null;
}

