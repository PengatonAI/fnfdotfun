import { Trade } from "@prisma/client";
import { PnLResult, TokenPosition, ProcessedTrade } from "./types";
import { pricingProvider } from "./current-prices";

/**
 * Internal FIFO cost bucket for tracking position cost basis.
 * Each bucket represents a purchase at a specific cost per unit.
 */
interface CostBucket {
  quantity: number;
  cost: number; // total USD cost for this bucket
}

/**
 * Normalize Trade records from Prisma to ProcessedTrade format.
 * Converts timestamps and maps fields to a consistent structure.
 * 
 * @param trades - Array of Trade records from Prisma
 * @returns Array of ProcessedTrade records sorted ascending by timestamp
 */
function normalizeTrades(trades: Trade[]): ProcessedTrade[] {
  const processed: ProcessedTrade[] = [];

  for (const trade of trades) {
    // Ensure timestamp is a Date object
    const timestamp = trade.timestamp instanceof Date 
      ? trade.timestamp 
      : new Date(trade.timestamp);

    // Extract token addresses from raw field if available, otherwise derive from base/quote
    let tokenInAddress: string | null = null;
    let tokenOutAddress: string | null = null;

    // Try to extract from raw field first
    try {
      if (trade.raw) {
        const rawData = typeof trade.raw === "string" ? JSON.parse(trade.raw) : trade.raw;
        tokenInAddress = rawData?.tokenInAddress ?? null;
        tokenOutAddress = rawData?.tokenOutAddress ?? null;
      }
    } catch (e) {
      // Invalid JSON in raw field, continue with derivation
    }

    // If not in raw, derive from baseTokenAddress/quoteTokenAddress based on direction
    if (!tokenInAddress || !tokenOutAddress) {
      const direction = trade.direction?.toUpperCase() as "BUY" | "SELL" | undefined;
      
      if (direction === "BUY") {
        // For BUY: base = tokenOut (what we receive), quote = tokenIn (what we pay)
        tokenInAddress = trade.quoteTokenAddress || null;
        tokenOutAddress = trade.baseTokenAddress || null;
      } else if (direction === "SELL") {
        // For SELL: base = tokenIn (what we receive), quote = tokenOut (what we pay)
        tokenInAddress = trade.baseTokenAddress || null;
        tokenOutAddress = trade.quoteTokenAddress || null;
      } else {
        // Unknown direction, use base as tokenOut, quote as tokenIn as fallback
        tokenInAddress = trade.quoteTokenAddress || null;
        tokenOutAddress = trade.baseTokenAddress || null;
      }
    }

    // Map direction to ensure it's "BUY" or "SELL"
    const direction = (trade.direction?.toUpperCase() === "SELL" ? "SELL" : "BUY") as "BUY" | "SELL";

    // Amount: prefer normalizedAmountOut, fallback to normalizedAmountIn
    const amount = trade.normalizedAmountOut ?? trade.normalizedAmountIn ?? null;

    processed.push({
      tradeId: trade.id,
      timestamp,
      tokenInAddress,
      tokenOutAddress,
      chain: trade.chain,
      direction,
      amount,
      usdValue: trade.usdValue ?? null,
      // PnL fields will be calculated later
    });
  }

  // Sort ascending by timestamp
  processed.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());

  return processed;
}

/**
 * Group trades by token address and chain.
 * Creates a unique key from (tokenAddress + "_" + chain).
 * 
 * @param trades - Array of ProcessedTrade records
 * @returns Record mapping token keys to arrays of trades
 */
function groupTradesByToken(trades: ProcessedTrade[]): Record<string, ProcessedTrade[]> {
  const grouped: Record<string, ProcessedTrade[]> = {};

  for (const trade of trades) {
    // Prefer tokenOutAddress, fallback to tokenInAddress
    const tokenAddress = trade.tokenOutAddress ?? trade.tokenInAddress;

    // Skip if both addresses are null
    if (!tokenAddress) {
      continue;
    }

    // Create grouping key: tokenAddress + "_" + chain
    const key = `${tokenAddress}_${trade.chain}`;

    if (!grouped[key]) {
      grouped[key] = [];
    }

    grouped[key].push(trade);
  }

  return grouped;
}

/**
 * Build FIFO cost basis buckets for a token group.
 * Processes trades chronologically to maintain FIFO order.
 * 
 * For BUY trades: Creates new cost buckets with quantity and USD cost.
 * For SELL trades: Consumes buckets in FIFO order (oldest first) to reduce position.
 * 
 * @param trades - Array of ProcessedTrade records for a single token, already sorted ascending by timestamp
 * @returns Array of remaining CostBucket records after processing all trades
 */
function buildFifoBuckets(trades: ProcessedTrade[]): CostBucket[] {
  const buckets: CostBucket[] = [];

  for (const trade of trades) {
    if (trade.direction === "BUY") {
      // BUY: Increase position by creating a new FIFO bucket
      const quantity = trade.amount ?? 0;
      const cost = trade.usdValue ?? 0;

      // Only create bucket if we have valid quantity and cost
      if (quantity > 0 && cost >= 0) {
        buckets.push({
          quantity,
          cost,
        });
      }
    } else if (trade.direction === "SELL") {
      // SELL: Reduce position by consuming buckets in FIFO order (oldest first)
      let remainingToSell = trade.amount ?? 0;

      while (remainingToSell > 0 && buckets.length > 0) {
        const bucket = buckets[0];

        if (bucket.quantity <= remainingToSell) {
          // Consume whole bucket
          remainingToSell -= bucket.quantity;
          buckets.shift();
        } else {
          // Consume part of bucket
          bucket.quantity -= remainingToSell;
          remainingToSell = 0;
        }
      }
    }
  }

  return buckets;
}

/**
 * Compute realized PnL for all trades using FIFO cost basis.
 * Processes trades chronologically and calculates PnL for each SELL trade.
 * 
 * @param trades - Array of ProcessedTrade records, already sorted ascending by timestamp
 * @returns Object containing total realized PnL and trade history with PnL fields populated
 */
function computeRealizedPnlForTrades(
  trades: ProcessedTrade[]
): { realizedPnl: number; tradeHistory: ProcessedTrade[] } {
  const buckets: CostBucket[] = [];
  let realizedPnl = 0;
  const history: ProcessedTrade[] = [];

  for (const trade of trades) {
    // Clone for output
    const tradeRecord: ProcessedTrade = { ...trade };

    const qty = trade.amount ?? 0;
    const cost = trade.usdValue ?? 0;

    if (trade.direction === "BUY") {
      // Add new bucket
      if (qty > 0 && cost >= 0) {
        buckets.push({ quantity: qty, cost });
      }

      // No realized PnL on buys
      tradeRecord.realizedPnL = 0;
      tradeRecord.costBasisUsed = 0;
    } else if (trade.direction === "SELL") {
      let remainingToSell = qty;
      let sellValue = cost ?? 0; // Value of this SELL in USD
      let totalCostBasisUsed = 0;

      // FIFO consume buckets
      while (remainingToSell > 0 && buckets.length > 0) {
        const bucket = buckets[0];
        const takeQty = Math.min(bucket.quantity, remainingToSell);
        const avgCost = bucket.cost / bucket.quantity;

        const costPortion = takeQty * avgCost;
        totalCostBasisUsed += costPortion;

        bucket.quantity -= takeQty;
        bucket.cost -= costPortion;
        remainingToSell -= takeQty;

        if (bucket.quantity <= 0.0000001) {
          buckets.shift();
        }
      }

      // Compute realized PnL for this SELL trade
      const pnl = sellValue - totalCostBasisUsed;
      realizedPnl += pnl;

      tradeRecord.realizedPnL = pnl;
      tradeRecord.costBasisUsed = totalCostBasisUsed;
    }

    history.push(tradeRecord);
  }

  return {
    realizedPnl,
    tradeHistory: history,
  };
}

/**
 * Build open positions from remaining FIFO buckets after processing all trades.
 * Calculates total quantity, cost basis, and average cost per token.
 * 
 * @param tradesByToken - Record mapping token keys to arrays of trades
 * @returns Array of TokenPosition records for tokens with remaining quantities
 */
function buildOpenPositions(
  tradesByToken: Record<string, ProcessedTrade[]>
): TokenPosition[] {
  const positions: TokenPosition[] = [];

  for (const key of Object.keys(tradesByToken)) {
    const trades = tradesByToken[key];

    if (trades.length === 0) continue;

    // Determine token identifiers
    const sample = trades[0];
    const tokenAddress = sample.tokenOutAddress || sample.tokenInAddress;
    const chain = sample.chain;
    // ProcessedTrade doesn't have tokenSymbol field yet, leave as null
    const tokenSymbol: string | null = null;

    // Rebuild FIFO buckets for this token
    const buckets: CostBucket[] = [];
    for (const t of trades) {
      const qty = t.amount ?? 0;
      const cost = t.usdValue ?? 0;

      if (t.direction === "BUY") {
        if (qty > 0 && cost >= 0) {
          buckets.push({ quantity: qty, cost });
        }
      } else if (t.direction === "SELL") {
        let remainingToSell = qty;

        while (remainingToSell > 0 && buckets.length > 0) {
          const bucket = buckets[0];
          const takeQty = Math.min(bucket.quantity, remainingToSell);
          const avgCost = bucket.cost / bucket.quantity;

          bucket.quantity -= takeQty;
          bucket.cost -= takeQty * avgCost;
          remainingToSell -= takeQty;

          if (bucket.quantity <= 0.0000001) {
            buckets.shift();
          }
        }
      }
    }

    // After processing all trades, buckets represent open positions
    const totalQuantity = buckets.reduce((sum, b) => sum + b.quantity, 0);
    const totalCostBasis = buckets.reduce((sum, b) => sum + b.cost, 0);
    const avgCostBasis = totalQuantity > 0 ? totalCostBasis / totalQuantity : 0;

    if (totalQuantity > 0) {
      positions.push({
        tokenSymbol,
        tokenAddress: tokenAddress ?? null,
        chain,
        quantity: totalQuantity,
        avgCostBasis,
        totalCostBasis,
        // Unrealized PnL + currentValue will be added in Step 6
        currentValue: undefined,
        unrealizedPnL: undefined,
        realizedPnL: 0,
      });
    }
  }

  return positions;
}

/**
 * Apply current prices to positions and calculate unrealized PnL.
 * Updates positions with currentValue and unrealizedPnL if prices are available.
 * 
 * @param positions - Array of TokenPosition records
 * @param currentPrices - Optional map of current prices keyed by "${tokenAddress}_${chain}"
 * @returns Object containing updated positions and total unrealized PnL
 */
function applyCurrentPricesToPositions(
  positions: TokenPosition[],
  currentPrices?: Record<string, number>
): { positionsWithPrices: TokenPosition[]; totalUnrealizedPnl: number } {
  if (!currentPrices) {
    // No prices provided, return positions unchanged with 0 unrealized PnL
    return {
      positionsWithPrices: positions,
      totalUnrealizedPnl: 0,
    };
  }

  let totalUnrealizedPnl = 0;

  const positionsWithPrices = positions.map((pos) => {
    if (!pos.tokenAddress) {
      return pos;
    }

    const key = `${pos.tokenAddress}_${pos.chain}`;
    const price = currentPrices[key];

    if (price == null || !isFinite(price) || price <= 0) {
      return pos;
    }

    const currentValue = pos.quantity * price;
    const unrealizedPnl = currentValue - pos.totalCostBasis;

    totalUnrealizedPnl += unrealizedPnl;

    return {
      ...pos,
      currentValue,
      unrealizedPnL: unrealizedPnl,
    };
  });

  return {
    positionsWithPrices,
    totalUnrealizedPnl,
  };
}

/**
 * Compute trading metrics from trade history.
 * Calculates win rate, volume, average win/loss, and trade statistics.
 * 
 * @param tradeHistory - Array of ProcessedTrade records with realizedPnL populated
 * @returns Object containing trading metrics
 */
function computeMetrics(
  tradeHistory: ProcessedTrade[]
): {
  totalTrades: number;
  profitableTrades: number;
  losingTrades: number;
  winRate: number;
  volume: number;
  avgWin: number;
  avgLoss: number;
} {
  let profitableTrades = 0;
  let losingTrades = 0;
  let totalWinPnl = 0;
  let totalLossPnl = 0;
  let winCount = 0;
  let lossCount = 0;

  let volume = 0; // total USD traded

  for (const trade of tradeHistory) {
    const value = trade.usdValue ?? 0;
    volume += value;

    // Only SELL trades generate realized PnL
    if (trade.direction === "SELL") {
      const pnl = trade.realizedPnL ?? 0;

      if (pnl > 0) {
        profitableTrades++;
        totalWinPnl += pnl;
        winCount++;
      } else if (pnl < 0) {
        losingTrades++;
        totalLossPnl += pnl;
        lossCount++;
      }
    }
  }

  const totalTrades = tradeHistory.length;
  const winRate = totalTrades > 0 ? profitableTrades / totalTrades : 0;

  const avgWin = winCount > 0 ? totalWinPnl / winCount : 0;
  const avgLoss = lossCount > 0 ? totalLossPnl / lossCount : 0;

  return {
    totalTrades,
    profitableTrades,
    losingTrades,
    winRate,
    volume,
    avgWin,
    avgLoss,
  };
}

/**
 * Compute PnL (Profit and Loss) for a set of trades.
 * 
 * This is a pure function that takes an array of Trade records and calculates:
 * - Open positions per token
 * - Realized PnL (from closed positions)
 * - Unrealized PnL (from open positions)
 * - Trading metrics (win rate, ROI, etc.)
 * 
 * @param trades - Array of Trade records from Prisma
 * @param currentPrices - Optional map of current prices keyed by "${tokenAddress}_${chain}"
 * @returns PnLResult with positions, PnL values, metrics, and processed trade history
 */
export function computePnL(
  trades: Trade[],
  currentPrices?: Record<string, number>
): PnLResult {
  // 1. Normalize & sort trades (ascending by timestamp)
  const processedTrades = normalizeTrades(trades);

  // 2. Group by token (tokenOutAddress or tokenInAddress)
  const tradesByToken = groupTradesByToken(processedTrades);

  // 3. Build FIFO cost basis buckets
  // Iterate each token group and build FIFO buckets for position tracking
  for (const [tokenKey, tokenTrades] of Object.entries(tradesByToken)) {
    const buckets = buildFifoBuckets(tokenTrades);
    // Buckets are built and stored locally for verification
    // Will be used in later steps for PnL calculations
  }

  // 4. Compute realized PnL
  const { realizedPnl, tradeHistory } = computeRealizedPnlForTrades(processedTrades);

  // 5. Track open positions
  const positions = buildOpenPositions(tradesByToken);

  // 6. Apply current prices and compute unrealized PnL
  const { positionsWithPrices, totalUnrealizedPnl } = applyCurrentPricesToPositions(
    positions,
    currentPrices
  );

  const totalPnL = realizedPnl + totalUnrealizedPnl;

  // 7. Compute metrics
  const metrics = computeMetrics(tradeHistory);

  // 8. Return PnLResult

  return {
    positions: positionsWithPrices,
    realizedPnL: realizedPnl,
    unrealizedPnL: totalUnrealizedPnl,
    totalPnL,
    metrics,
    tradeHistory,
  };
}

