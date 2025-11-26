// Load environment variables before any other imports
// Check if dotenv is installed
let dotenvInstalled = false;
try {
  require('dotenv');
  dotenvInstalled = true;
} catch (error) {
  // dotenv not installed
}

if (!dotenvInstalled) {
  console.error("Installing dotenv...");
  console.error("\nError: dotenv package is not installed.");
  console.error("Please run: npm install dotenv");
  process.exit(1);
}

import * as dotenv from 'dotenv';
import * as path from 'path';

// Load .env.local first, then .env
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

import { Alchemy, Network } from "alchemy-sdk";
import { prisma } from "../lib/prisma";

/**
 * Get Alchemy API key from environment
 */
function getAlchemyApiKey(): string {
  const key = process.env.ALCHEMY_API_KEY;
  if (!key) {
    throw new Error("ALCHEMY_API_KEY environment variable is not set");
  }
  return key;
}

/**
 * Get Alchemy network (default to Ethereum mainnet)
 */
function getAlchemyInstance(): Alchemy {
  const apiKey = getAlchemyApiKey();
  return new Alchemy({
    apiKey,
    network: Network.ETH_MAINNET, // Default to Ethereum mainnet
  });
}

/**
 * Check if a transfer is ETH (native)
 */
function isEthTransfer(transfer: any): boolean {
  return !transfer.rawContract?.address || transfer.category === "external";
}

/**
 * Check if a transfer is ERC20
 */
function isErc20Transfer(transfer: any): boolean {
  return transfer.category === "erc20" && transfer.rawContract?.address;
}

/**
 * Simulate swap detection logic
 */
function detectSwaps(
  walletAddress: string,
  transfers: any[]
): { swaps: any[]; filtered: Array<{ transfer: any; reason: string }> } {
  const walletAddrLower = walletAddress.toLowerCase();
  const swaps: any[] = [];
  const filtered: Array<{ transfer: any; reason: string }> = [];

  // Group transfers by transaction hash
  const transfersByTx = new Map<string, any[]>();
  for (const transfer of transfers) {
    const txHash = transfer.hash;
    if (!transfersByTx.has(txHash)) {
      transfersByTx.set(txHash, []);
    }
    transfersByTx.get(txHash)!.push(transfer);
  }

  for (const [txHash, txTransfers] of Array.from(transfersByTx.entries())) {
    // Separate incoming and outgoing
    const incoming: any[] = [];
    const outgoing: any[] = [];

    for (const transfer of txTransfers) {
      const from = transfer.from?.toLowerCase();
      const to = transfer.to?.toLowerCase();

      if (to === walletAddrLower) {
        incoming.push(transfer);
      } else if (from === walletAddrLower) {
        outgoing.push(transfer);
      }
    }

    // Check swap patterns
    const hasIncoming = incoming.length > 0;
    const hasOutgoing = outgoing.length > 0;

    if (!hasIncoming || !hasOutgoing) {
      filtered.push({
        transfer: { txHash, transferCount: txTransfers.length },
        reason: hasIncoming
          ? "Only incoming transfers (no outgoing)"
          : "Only outgoing transfers (no incoming)",
      });
      continue;
    }

    // Check for swap patterns
    const erc20Out = outgoing.filter(isErc20Transfer);
    const erc20In = incoming.filter(isErc20Transfer);
    const ethOut = outgoing.filter(isEthTransfer);
    const ethIn = incoming.filter(isEthTransfer);

    let isSwap = false;
    let swapType = "";

    // Pattern 1: ERC20 out + ERC20 in
    if (erc20Out.length > 0 && erc20In.length > 0) {
      isSwap = true;
      swapType = "ERC20-ERC20 swap";
    }
    // Pattern 2: ETH out + token in
    else if (ethOut.length > 0 && erc20In.length > 0) {
      isSwap = true;
      swapType = "ETH-ERC20 swap (BUY)";
    }
    // Pattern 3: token out + ETH in
    else if (erc20Out.length > 0 && ethIn.length > 0) {
      isSwap = true;
      swapType = "ERC20-ETH swap (SELL)";
    }
    // Pattern 4: ETH out + ETH in (not a swap)
    else if (ethOut.length > 0 && ethIn.length > 0) {
      filtered.push({
        transfer: { txHash, transferCount: txTransfers.length },
        reason: "ETH-ETH transfer (not a swap)",
      });
      continue;
    } else {
      filtered.push({
        transfer: { txHash, transferCount: txTransfers.length },
        reason: "Unknown pattern or only one token type",
      });
      continue;
    }

    if (isSwap) {
      swaps.push({
        txHash,
        type: swapType,
        transfers: txTransfers.length,
        incoming: incoming.length,
        outgoing: outgoing.length,
        erc20In: erc20In.length,
        erc20Out: erc20Out.length,
        ethIn: ethIn.length,
        ethOut: ethOut.length,
      });
    }
  }

  return { swaps, filtered };
}

async function diagnoseSync() {
  const walletAddress = process.argv[2];

  if (!walletAddress) {
    console.error("Usage: npx tsx scripts/diagnose-sync.ts <WALLET_ADDRESS>");
    process.exit(1);
  }

  try {
    console.log("=".repeat(80));
    console.log("SYNC DIAGNOSTIC SCRIPT");
    console.log("=".repeat(80));
    console.log(`Wallet Address: ${walletAddress}\n`);

    // ============================================================
    // A. DATABASE CHECK
    // ============================================================
    console.log("-".repeat(80));
    console.log("A. DATABASE CHECK");
    console.log("-".repeat(80));

    const wallet = await prisma.wallet.findFirst({
      where: {
        address: walletAddress.toLowerCase(),
      },
      select: {
        id: true,
        userId: true,
        address: true,
        chain: true,
        createdAt: true,
      },
    });

    if (wallet) {
      console.log("✅ Wallet found in database:");
      console.log(JSON.stringify(wallet, null, 2));
    } else {
      console.log("❌ Wallet not in database");
    }
    console.log();

    // ============================================================
    // B. ALCHEMY API CHECK
    // ============================================================
    console.log("-".repeat(80));
    console.log("B. ALCHEMY API CHECK");
    console.log("-".repeat(80));

    const alchemy = getAlchemyInstance();

    // Declare variables outside try blocks for later use
    let fromTransfers: any[] = [];
    let toTransfers: any[] = [];

    // B.1: Check fromAddress transfers
    console.log("\n1. Fetching transfers FROM wallet...");
    try {
      const fromTransfersResponse = await alchemy.core.getAssetTransfers({
        fromAddress: walletAddress,
        category: ["external", "erc20", "erc721", "erc1155"],
        fromBlock: "0x0",
        toBlock: "latest",
        withMetadata: true,
        order: "asc",
      });

      fromTransfers = fromTransfersResponse.transfers || [];
      console.log(`✅ Found ${fromTransfers.length} transfers FROM wallet`);
      console.log("\nFull Alchemy Response (fromAddress):");
      console.log(JSON.stringify(fromTransfersResponse, null, 2));

      if (fromTransfers.length > 0) {
        console.log("\nFirst 5 transfers FROM wallet:");
        fromTransfers.slice(0, 5).forEach((transfer: any, index: number) => {
          console.log(`\nTransfer ${index + 1}:`);
          console.log(JSON.stringify(transfer, null, 2));
        });
      }
    } catch (error) {
      console.error("❌ Error fetching FROM transfers:", error);
      if (error instanceof Error) {
        console.error("Error message:", error.message);
      }
    }

    console.log("\n" + "-".repeat(80));

    // B.2: Check toAddress transfers
    console.log("\n2. Fetching transfers TO wallet...");
    try {
      const toTransfersResponse = await alchemy.core.getAssetTransfers({
        toAddress: walletAddress,
        category: ["external", "erc20", "erc721", "erc1155"],
        fromBlock: "0x0",
        toBlock: "latest",
        withMetadata: true,
        order: "asc",
      });

      toTransfers = toTransfersResponse.transfers || [];
      console.log(`✅ Found ${toTransfers.length} transfers TO wallet`);
      console.log("\nFull Alchemy Response (toAddress):");
      console.log(JSON.stringify(toTransfersResponse, null, 2));

      if (toTransfers.length > 0) {
        console.log("\nFirst 5 transfers TO wallet:");
        toTransfers.slice(0, 5).forEach((transfer: any, index: number) => {
          console.log(`\nTransfer ${index + 1}:`);
          console.log(JSON.stringify(transfer, null, 2));
        });
      }

      // ============================================================
      // C. SYNC LOGIC TEST
      // ============================================================
      console.log("\n" + "=".repeat(80));
      console.log("C. SYNC LOGIC TEST");
      console.log("=".repeat(80));

      // Combine both sets for complete picture (as done in actual sync)
      const allTransfers = [...fromTransfers, ...toTransfers];
      console.log(`\nTotal unique transfers: ${allTransfers.length}`);
      console.log(`  - FROM wallet: ${fromTransfers.length}`);
      console.log(`  - TO wallet: ${toTransfers.length}`);

      // Remove duplicates (same hash + from + to)
      const uniqueTransfers = Array.from(
        new Map(
          allTransfers.map((t) => [
            `${t.hash}-${t.from}-${t.to}`,
            t,
          ])
        ).values()
      );
      console.log(`  - Unique transfers: ${uniqueTransfers.length}`);

      // Simulate swap detection
      const { swaps, filtered } = detectSwaps(walletAddress, uniqueTransfers);

      console.log(`\n✅ Swaps detected: ${swaps.length}`);
      if (swaps.length > 0) {
        console.log("\nDetected swaps:");
        swaps.slice(0, 10).forEach((swap: any, index: number) => {
          console.log(`\nSwap ${index + 1}:`);
          console.log(JSON.stringify(swap, null, 2));
        });
        if (swaps.length > 10) {
          console.log(`\n... and ${swaps.length - 10} more swaps`);
        }
      }

      console.log(`\n❌ Filtered out: ${filtered.length}`);
      if (filtered.length > 0) {
        console.log("\nFiltered transfers (not swaps):");
        filtered.slice(0, 10).forEach((item: any, index: number) => {
          console.log(
            `\n${index + 1}. TX: ${item.transfer.txHash} - ${item.reason}`
          );
        });
        if (filtered.length > 10) {
          console.log(`\n... and ${filtered.length - 10} more filtered`);
        }
      }
    } catch (error) {
      console.error("❌ Error fetching TO transfers:", error);
      if (error instanceof Error) {
        console.error("Error message:", error.message);
      }
    }

    console.log("\n" + "=".repeat(80));
    console.log("DIAGNOSTIC COMPLETE");
    console.log("=".repeat(80));
  } catch (error) {
    console.error("\n❌ Fatal error:", error);
    if (error instanceof Error) {
      console.error("Error message:", error.message);
      console.error("Stack:", error.stack);
    }
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the script
diagnoseSync()
  .then(() => {
    process.exit(0);
  })
  .catch((error) => {
    console.error("Unexpected error:", error);
    process.exit(1);
  });
