import { SyncParams, SyncResult, CanonicalTradeInput } from "./types";

// Known Solana DEX program IDs
const DEX_PROGRAMS: Record<string, string> = {
  // Jupiter
  "JUP6LkbZbjS1jKKwapdHNy74zcZ3tLUZoi5QNyVTaV4": "jupiter",
  "JUP4Fb2cqiRUcaTHdrPC8h2gNsA2ETXiPDD33WcGuJB": "jupiter-v4",
  // Orca
  "9W959DqEETiGZocYWCQPaJ6sBmUzgfxXfqGeTEdp3aQP": "orca",
  "whirLbMiicVdio4qvUfM5KAg6Ct8VwpYzGff3uctyCc": "orca-whirlpool",
  // Raydium
  "675kPX9MHTjS2zt1qfr1NYHuzeLXfQM9H24wFSUt1Mp8": "raydium",
  "CAMMCzo5YL8w4VFF8KVHrK22GGUsp5VTaW7grrKgrWqK": "raydium-clmm",
  // Meteora
  "Eo7WjKq67rjJQSZxS6z3YkapzY3eMj6Xy8X5EQVn5UaB": "meteora",
  // Lifinity
  "EewxydAPCCVuNEyrVN68PuSYdQ7wKn27V9Gjeoi8dy3S": "lifinity",
};

/**
 * Get Helius API key from environment
 */
function getHeliusApiKey(): string {
  const key = process.env.HELIUS_API_KEY;
  if (!key) {
    throw new Error("HELIUS_API_KEY environment variable is not set");
  }
  return key;
}

/**
 * Get Helius API base URL
 */
function getHeliusBaseUrl(): string {
  return "https://api.helius.xyz/v0";
}

/**
 * Fetch transactions from Helius
 */
async function fetchHeliusTransactions(
  address: string,
  before?: string,
  limit: number = 1000
): Promise<any[]> {
  const apiKey = getHeliusApiKey();
  const baseUrl = getHeliusBaseUrl();

  const params = new URLSearchParams({
    "api-key": apiKey,
    limit: limit.toString(),
  });

  if (before) {
    params.append("before", before);
  }

  const url = `${baseUrl}/addresses/${address}/transactions?${params.toString()}`;

  try {
    const response = await fetch(url, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Helius API error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    return data || [];
  } catch (error) {
    console.error("Error fetching Helius transactions:", error);
    throw error;
  }
}

/**
 * Detect platform from program ID
 */
function detectPlatform(programId: string): string {
  return DEX_PROGRAMS[programId] || "unknown";
}

/**
 * Extract swap actions from Helius transaction
 */
function extractSwapActions(transaction: any): any[] {
  const swapActions: any[] = [];

  // Helius provides parsed transaction data
  // Look for swap events in the transaction
  if (transaction.events?.swap) {
    swapActions.push({
      type: "swap",
      ...transaction.events.swap,
      signature: transaction.signature,
      timestamp: transaction.timestamp,
      slot: transaction.slot,
    });
  }

  // Also check for Jupiter-style swaps
  if (transaction.events?.jupiter?.swap) {
    swapActions.push({
      type: "jupiter-swap",
      ...transaction.events.jupiter.swap,
      signature: transaction.signature,
      timestamp: transaction.timestamp,
      slot: transaction.slot,
    });
  }

  // Check instruction accounts for DEX program IDs
  if (transaction.instructions) {
    for (const instruction of transaction.instructions) {
      const programId = instruction.programId;
      if (DEX_PROGRAMS[programId]) {
        swapActions.push({
          type: "dex-swap",
          programId,
          ...instruction,
          signature: transaction.signature,
          timestamp: transaction.timestamp,
          slot: transaction.slot,
        });
      }
    }
  }

  return swapActions;
}

/**
 * Normalize Helius swap action to canonical trade
 */
function normalizeSwapToTrade(
  userId: string,
  walletId: string,
  walletAddress: string,
  swapAction: any,
  transaction: any
): CanonicalTradeInput | null {
  try {
    // Extract token addresses and amounts
    // Helius format varies by DEX, so we need to handle multiple formats
    let baseTokenAddress = "";
    let quoteTokenAddress = "";
    let baseAmount = "0";
    let quoteAmount = "0";
    let feeAmount: string | null = null;
    let feeTokenAddress: string | null = null;

    // Try to extract from Jupiter format
    if (swapAction.type === "jupiter-swap" || swapAction.type === "swap") {
      // Jupiter provides nativeAmountIn, nativeAmountOut
      if (swapAction.nativeAmountIn && swapAction.nativeAmountOut) {
        baseTokenAddress = swapAction.tokenIn || "";
        quoteTokenAddress = swapAction.tokenOut || "";
        baseAmount = (swapAction.nativeAmountIn / 1e9).toFixed(18); // SOL has 9 decimals
        quoteAmount = (swapAction.nativeAmountOut / 1e9).toFixed(18);
      } else if (swapAction.amountIn && swapAction.amountOut) {
        baseTokenAddress = swapAction.tokenIn || "";
        quoteTokenAddress = swapAction.tokenOut || "";
        // Amounts might already be in human-readable format
        baseAmount = swapAction.amountIn.toString();
        quoteAmount = swapAction.amountOut.toString();
      }
    }

    // If we couldn't extract, try to parse from instruction accounts
    if (!baseTokenAddress || !quoteTokenAddress) {
      // This is a simplified parser - in production you'd want more sophisticated parsing
      // For now, mark as unknown if we can't parse
      baseTokenAddress = swapAction.tokenIn || "unknown";
      quoteTokenAddress = swapAction.tokenOut || "unknown";
      baseAmount = "0";
      quoteAmount = "0";
    }

    // Determine direction: if wallet received base token, it's a BUY
    // This is simplified - we'd need to check account changes
    const direction: "BUY" | "SELL" = "BUY"; // Default, would need better heuristics

    // Calculate price
    const baseAmountNum = parseFloat(baseAmount);
    const quoteAmountNum = parseFloat(quoteAmount);
    const price = baseAmountNum > 0 ? parseFloat((quoteAmountNum / baseAmountNum).toFixed(18)) : null;

    // Detect platform
    const platform = detectPlatform(swapAction.programId || transaction.programId || "");

    // Extract fee if available
    if (transaction.meta?.fee) {
      feeAmount = (transaction.meta.fee / 1e9).toFixed(18); // SOL fee
      feeTokenAddress = "So11111111111111111111111111111111111112"; // SOL mint
    }

    return {
      userId,
      walletId,
      walletAddress: walletAddress.toLowerCase(),
      chain: "solana",
      platform,
      direction,
      baseTokenAddress,
      quoteTokenAddress,
      baseAmount,
      quoteAmount,
      price,
      feeAmount,
      feeTokenAddress,
      txHash: swapAction.signature || transaction.signature,
      txIndex: null, // Solana doesn't use txIndex
      timestamp: new Date(swapAction.timestamp * 1000 || transaction.timestamp * 1000 || Date.now()),
      tokenInSymbol: null,
      tokenOutSymbol: null,
      tokenNameIn: null,
      tokenNameOut: null,
      normalizedAmountIn: baseAmountNum || null,
      normalizedAmountOut: quoteAmountNum || null,
      decimalsIn: null,
      decimalsOut: null,
      tokenInAddress: baseTokenAddress || undefined,
      tokenOutAddress: quoteTokenAddress || undefined,
      raw: {
        swapAction,
        transaction,
      },
    };
  } catch (error) {
    console.error("Error normalizing Solana swap:", error);
    return null;
  }
}

/**
 * Sync Solana wallet trades using Helius
 */
export async function syncSolanaWalletTrades(
  params: SyncParams & { walletId: string }
): Promise<SyncResult> {
  const { userId, walletAddress, lastSyncedCursor, walletId } = params;

  try {
    // Fetch transactions from Helius
    const transactions = await fetchHeliusTransactions(
      walletAddress,
      lastSyncedCursor || undefined
    );

    // Extract swap actions from transactions
    const swapActions: any[] = [];
    for (const tx of transactions) {
      const swaps = extractSwapActions(tx);
      swapActions.push(...swaps.map((swap) => ({ swap, tx })));
    }

    // Normalize to canonical trades
    const tradesMap = new Map<string, CanonicalTradeInput>();
    for (const { swap, tx } of swapActions) {
      const trade = normalizeSwapToTrade(
        userId,
        walletId,
        walletAddress,
        swap,
        tx
      );

      if (trade) {
        const key = trade.txHash;
        if (!tradesMap.has(key)) {
          tradesMap.set(key, trade);
        }
      }
    }

    const trades = Array.from(tradesMap.values());

    // Determine new cursor (latest signature or timestamp)
    let newCursor: string | null = lastSyncedCursor;
    if (transactions.length > 0) {
      // Use the oldest transaction signature as cursor (for pagination)
      const oldestTx = transactions[transactions.length - 1];
      newCursor = oldestTx.signature;
    }

    return {
      newTrades: trades.length,
      transfersFetched: transactions.length,
      lastSyncedCursor: newCursor,
    };
  } catch (error) {
    console.error("Error syncing Solana trades:", error);
    throw error;
  }
}

/**
 * Export trades for persistence
 */
export async function getSolanaTrades(
  params: SyncParams,
  walletId: string
): Promise<CanonicalTradeInput[]> {
  const { userId, walletAddress, lastSyncedCursor } = params;

  const transactions = await fetchHeliusTransactions(
    walletAddress,
    lastSyncedCursor || undefined
  );

  const swapActions: any[] = [];
  for (const tx of transactions) {
    const swaps = extractSwapActions(tx);
    swapActions.push(...swaps.map((swap) => ({ swap, tx })));
  }

  const tradesMap = new Map<string, CanonicalTradeInput>();
  for (const { swap, tx } of swapActions) {
    const trade = normalizeSwapToTrade(
      userId,
      walletId,
      walletAddress,
      swap,
      tx
    );

    if (trade) {
      const key = trade.txHash;
      if (!tradesMap.has(key)) {
        tradesMap.set(key, trade);
      }
    }
  }

  return Array.from(tradesMap.values());
}

