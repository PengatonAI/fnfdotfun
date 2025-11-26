import { prisma } from "../lib/prisma";
import { buildTradeFromTransfers } from "../lib/trades/evm-sync";

/**
 * Cleanup script to re-parse all historical EVM trades using the new buildTradeFromTransfers function
 * This updates all trades with corrected parsed data (direction, prices, decimals, symbols, amounts)
 */
async function cleanupReparseTrades() {
  let totalTrades = 0;
  let successfullyUpdated = 0;
  let failedTrades = 0;
  let skippedTrades = 0;

  try {
    console.log("🔄 Starting trade re-parsing cleanup...\n");

    // Fetch all trades from the database
    const trades = await prisma.trade.findMany({
      where: {
        chain: "evm", // Only process EVM trades
      },
      orderBy: {
        timestamp: "asc", // Process oldest first
      },
    });

    totalTrades = trades.length;
    console.log(`📊 Found ${totalTrades} EVM trades to process\n`);

    if (totalTrades === 0) {
      console.log("✅ No trades to process. Exiting.");
      return;
    }

    // Process each trade
    for (let i = 0; i < trades.length; i++) {
      const trade = trades[i];
      const progress = `[${i + 1}/${totalTrades}]`;

      try {
        console.log(`${progress} 🔄 Starting to parse trade ${trade.id} (${trade.txHash})...`);

        // Extract transfers from the raw field
        let transfers: any[] = [];

        if (!trade.raw) {
          console.log(`${progress} ⚠️  Trade ${trade.id} (${trade.txHash}): Missing raw field, skipping`);
          skippedTrades++;
          continue;
        }

        try {
          // Parse raw field (may be string or object)
          const rawData = typeof trade.raw === "string" ? JSON.parse(trade.raw) : trade.raw;

          // Extract transfers array
          if (rawData.transfers && Array.isArray(rawData.transfers)) {
            transfers = rawData.transfers;
          } else if (Array.isArray(rawData)) {
            // Fallback: if raw is directly an array of transfers
            transfers = rawData;
          } else {
            console.log(`${progress} ⚠️  Trade ${trade.id} (${trade.txHash}): Invalid raw format, skipping`);
            skippedTrades++;
            continue;
          }
        } catch (parseError) {
          const reason = parseError instanceof Error ? parseError.message : String(parseError);
          console.log(`${progress} ❌ Trade ${trade.id} (${trade.txHash}): Failed to parse raw JSON - Reason: ${reason}, skipping`);
          skippedTrades++;
          continue;
        }

        if (transfers.length === 0) {
          console.log(`${progress} ⚠️  Trade ${trade.id} (${trade.txHash}): No transfers found in raw field, skipping`);
          skippedTrades++;
          continue;
        }

        // Validate required fields
        if (!trade.walletAddress || !trade.txHash || !trade.userId || !trade.walletId) {
          console.log(`${progress} ⚠️  Trade ${trade.id} (${trade.txHash}): Missing required fields, skipping`);
          skippedTrades++;
          continue;
        }

        console.log(`${progress} 📝 Parsing trade ${trade.id} with ${transfers.length} transfers...`);

        // Re-parse the trade using the new buildTradeFromTransfers function
        // Note: We use "ethereum" as default chain since historical trades don't store the specific chain name
        // Most EVM chains use ETH for gas, so this is a reasonable fallback
        let parsed;
        try {
          parsed = await buildTradeFromTransfers(
            trade.userId,
            trade.walletId,
            trade.walletAddress,
            trade.txHash,
            transfers,
            trade.timestamp,
            "ethereum" // Default to ethereum for historical trades
          );

          if (!parsed) {
            console.log(`${progress} ❌ Trade ${trade.id} (${trade.txHash}): Parsing failed - buildTradeFromTransfers returned null (not a valid swap), skipping`);
            skippedTrades++;
            continue;
          }

          console.log(`${progress} ✅ Parsing succeeded for trade ${trade.id} - Direction: ${parsed.direction}, TokenOut: ${parsed.tokenOutSymbol}, AmountOut: ${parsed.normalizedAmountOut}, Price: ${parsed.price}`);
        } catch (parseError) {
          const reason = parseError instanceof Error ? parseError.message : String(parseError);
          console.log(`${progress} ❌ Trade ${trade.id} (${trade.txHash}): Parsing failed - Reason: ${reason}, skipping`);
          skippedTrades++;
          continue;
        }

        // Extract token addresses from new fields or fall back to legacy fields
        const tokenInAddress = parsed.tokenInAddress ?? parsed.baseTokenAddress ?? "";
        const tokenOutAddress = parsed.tokenOutAddress ?? parsed.quoteTokenAddress ?? "";

        // Map new fields to legacy schema fields (for backward compatibility)
        // For BUY: base = tokenOut (what we receive), quote = tokenIn (what we pay)
        // For SELL: base = tokenIn (what we receive), quote = tokenOut (what we pay)
        const baseTokenAddress = parsed.direction === "BUY" ? tokenOutAddress : tokenInAddress;
        const quoteTokenAddress = parsed.direction === "BUY" ? tokenInAddress : tokenOutAddress;

        console.log(`${progress} 💾 Updating database for trade ${trade.id}...`);

        // Update the trade with the new parsed data
        try {
          await prisma.trade.update({
            where: { id: trade.id },
            data: {
              // Update parsed fields
              direction: parsed.direction,
              tokenInSymbol: parsed.tokenInSymbol,
              tokenOutSymbol: parsed.tokenOutSymbol,
              decimalsIn: parsed.decimalsIn,
              decimalsOut: parsed.decimalsOut,
              normalizedAmountIn: parsed.normalizedAmountIn,
              normalizedAmountOut: parsed.normalizedAmountOut,
              price: parsed.price,
              timestamp: parsed.timestamp,
              
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

          console.log(`${progress} ✅ Database update succeeded for trade ${trade.id}`);
          successfullyUpdated++;
        } catch (updateError) {
          const reason = updateError instanceof Error ? updateError.message : String(updateError);
          console.log(`${progress} ❌ Trade ${trade.id} (${trade.txHash}): Database update failed - Reason: ${reason}`);
          failedTrades++;
          continue;
        }
      } catch (error) {
        failedTrades++;
        const reason = error instanceof Error ? error.message : String(error);
        console.error(`${progress} ❌ Trade ${trade.id} (${trade.txHash}): Unexpected error - ${reason}`);
        // Continue processing other trades
      }
    }

    // Print summary
    console.log("\n" + "=".repeat(60));
    console.log("📊 CLEANUP SUMMARY");
    console.log("=".repeat(60));
    console.log(`Total trades processed:     ${totalTrades}`);
    console.log(`✅ Successfully updated:    ${successfullyUpdated}`);
    console.log(`⚠️  Skipped (no transfers): ${skippedTrades}`);
    console.log(`❌ Failed:                 ${failedTrades}`);
    console.log("=".repeat(60));

    if (successfullyUpdated > 0) {
      console.log("\n✨ All updated trades now have:");
      console.log("   - Correct BUY/SELL directions");
      console.log("   - Correct prices");
      console.log("   - Correct decimals");
      console.log("   - Correct token symbols");
      console.log("   - Correct normalized amounts");
    }
  } catch (error) {
    console.error("\n❌ Fatal error during cleanup:", error);
    if (error instanceof Error) {
      console.error("Error message:", error.message);
      console.error("Stack trace:", error.stack);
    }
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the script
cleanupReparseTrades()
  .then(() => {
    console.log("\n✅ Cleanup completed successfully");
    process.exit(0);
  })
  .catch((error) => {
    console.error("\n❌ Unexpected error:", error);
    process.exit(1);
  });

