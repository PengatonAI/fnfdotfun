import { prisma } from "@/lib/prisma";
import { CanonicalTradeInput } from "./types";
import { setProgress } from "./sync-status";

/**
 * Save canonical trades to database with deduplication
 */
export async function saveCanonicalTrades(
  userId: string,
  walletAddress: string,
  chain: "evm" | "solana",
  trades: CanonicalTradeInput[]
): Promise<number> {
  if (trades.length === 0) {
    return 0;
  }

  let inserted = 0;
  const total = trades.length;

  for (let i = 0; i < trades.length; i++) {
    const trade = trades[i];
    
    // Progress: Inside save loop
    setProgress(i + 1, total, `Saving trade ${i + 1}/${total}`);
    
    try {
      // Check if trade already exists using unique_trade constraint (walletAddress, chain, txHash)
      const existing = await prisma.trade.findUnique({
        where: {
          unique_trade: {
            walletAddress: trade.walletAddress.toLowerCase(),
            chain: trade.chain,
            txHash: trade.txHash,
          },
        },
      });

      // Extract display fields from raw if they exist (for direction-aware display)
      // These fields are computed in buildTradeFromTransfers and stored in trade.raw
      // Display fields determine which token/amount to show based on direction:
      // - SELL: display = tokenIn (sold token, e.g., MSIA)
      // - BUY: display = tokenOut (received token, e.g., ETH)
      let rawData: any = null;
      try {
        rawData = typeof trade.raw === "string" ? JSON.parse(trade.raw) : trade.raw;
      } catch (e) {
        // If raw is invalid JSON, treat as null
        rawData = null;
      }
      
      const displayTokenSymbol = rawData?.displayTokenSymbol ?? null;
      const displayTokenAddress = rawData?.displayTokenAddress ?? null;
      const displayAmount = rawData?.displayAmount ?? null;
      
      // Extract token addresses from new fields or fall back to legacy fields
      // This matches the cleanup script exactly
      const tokenInAddress = trade.tokenInAddress ?? trade.baseTokenAddress ?? "";
      const tokenOutAddress = trade.tokenOutAddress ?? trade.quoteTokenAddress ?? "";
      
      // Map new fields to legacy schema fields (matching cleanup script exactly)
      // For BUY: base = tokenOut (what we receive), quote = tokenIn (what we pay)
      // For SELL: base = tokenIn (what we receive), quote = tokenOut (what we pay)
      const baseTokenAddress = trade.direction === "BUY" ? tokenOutAddress : tokenInAddress;
      const quoteTokenAddress = trade.direction === "BUY" ? tokenInAddress : tokenOutAddress;
      
      // Note: Display fields (symbol, amount, tokenAddress) are stored in raw for UI consumption
      // The Prisma schema stores both tokenIn/tokenOut fields separately
      // UI should extract display fields from raw.displayTokenSymbol, raw.displayAmount, raw.displayTokenAddress
      // This ensures SELL trades show the sold token (MSIA) not the received token (ETH)

      // Log nativePrice to verify data is present before saving
      console.log("Saving trade with nativePrice:", trade.nativePrice);

      if (existing) {
        // Update existing trade with new parsed fields (matching cleanup script exactly)
        await prisma.trade.update({
          where: { id: existing.id },
          data: {
            // Update parsed fields (matching cleanup script exactly)
            direction: trade.direction,
            tokenInSymbol: trade.tokenInSymbol,
            tokenOutSymbol: trade.tokenOutSymbol,
            decimalsIn: trade.decimalsIn,
            decimalsOut: trade.decimalsOut,
            normalizedAmountIn: trade.normalizedAmountIn,
            normalizedAmountOut: trade.normalizedAmountOut,
            price: trade.price,
            // FORCE nativePrice to be saved (explicitly set, even if null/undefined)
            nativePrice: trade.nativePrice ?? null,
            // USD proof system fields (calculated at sync time)
            usdPricePerToken: trade.usdPricePerToken ?? null,
            usdValue: trade.usdValue ?? null,
            timestamp: trade.timestamp,
            
            // Update token addresses (map to legacy schema fields)
            baseTokenAddress,
            quoteTokenAddress,
            
            // Legacy fields (required by schema but not used - set to placeholders)
            baseAmount: "0",
            quoteAmount: "0",
            
            // Keep existing fields that should NOT change
            // userId, walletId, txHash, chain, raw are not included in update
          },
        });
      } else {
        // Create new trade with new parsed fields (matching cleanup script exactly)
        // Note: Display fields (symbol, amount, tokenAddress) are computed above and stored in raw
        // The schema stores both tokenIn/tokenOut fields, and UI can use display fields from raw
        await prisma.trade.create({
          data: {
            userId: trade.userId,
            walletId: trade.walletId,
            walletAddress: trade.walletAddress.toLowerCase(),
            chain: trade.chain,
            platform: trade.platform ?? "unknown",
            direction: trade.direction,
            // Map new token addresses to legacy schema fields
            baseTokenAddress,
            quoteTokenAddress,
            // Legacy fields (required by schema but not used - set to "0" as placeholder)
            baseAmount: "0",
            quoteAmount: "0",
            // New parsed fields (these are what we use)
            price: trade.price,
            // FORCE nativePrice to be saved (explicitly set, even if null/undefined)
            nativePrice: trade.nativePrice ?? null,
            // USD proof system fields (calculated at sync time)
            usdPricePerToken: trade.usdPricePerToken ?? null,
            usdValue: trade.usdValue ?? null,
            tokenInSymbol: trade.tokenInSymbol,
            tokenOutSymbol: trade.tokenOutSymbol,
            tokenNameIn: trade.tokenNameIn,
            tokenNameOut: trade.tokenNameOut,
            normalizedAmountIn: trade.normalizedAmountIn,
            normalizedAmountOut: trade.normalizedAmountOut,
            decimalsIn: trade.decimalsIn,
            decimalsOut: trade.decimalsOut,
            feeAmount: trade.feeAmount,
            feeTokenAddress: trade.feeTokenAddress,
            txHash: trade.txHash,
            txIndex: trade.txIndex,
            timestamp: trade.timestamp,
            // Store raw with display fields for UI to use
            raw: trade.raw ? JSON.stringify(trade.raw) : null,
          },
        });
      }
      inserted++;
    } catch (error) {
      // Log but continue - might be duplicate or constraint violation
      console.error(`Error saving trade ${trade.txHash}:`, error);
    }
  }

  return inserted;
}

