import { NextRequest, NextResponse } from "next/server";
import { buildTradeFromTransfers } from "@/lib/trades/evm-sync";
import { getHistoricalNativePrice } from "@/lib/price/historical";
import { requireDebugAccess } from "@/lib/security/debug-guard";

export const dynamic = 'force-dynamic'; // No caching

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
 * Get Alchemy API URL for a chain
 */
function getAlchemyApiUrl(chain: string = "ethereum"): string {
  const chainMap: Record<string, string> = {
    ethereum: "https://eth-mainnet.g.alchemy.com/v2",
    polygon: "https://polygon-mainnet.g.alchemy.com/v2",
    arbitrum: "https://arb-mainnet.g.alchemy.com/v2",
    optimism: "https://opt-mainnet.g.alchemy.com/v2",
    base: "https://base-mainnet.g.alchemy.com/v2",
  };
  const baseUrl = chainMap[chain.toLowerCase()] || chainMap.ethereum;
  return baseUrl;
}

/**
 * Get transaction receipt to find the block number
 */
async function getTransactionReceipt(
  txHash: string,
  apiKey: string,
  chain: string = "ethereum"
): Promise<{ blockNumber: string; from: string; to: string } | null> {
  const apiUrl = getAlchemyApiUrl(chain);
  const url = `${apiUrl}/${apiKey}`;

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      id: 1,
      jsonrpc: "2.0",
      method: "eth_getTransactionReceipt",
      params: [txHash],
    }),
  });

  if (!response.ok) {
    return null;
  }

  const data = await response.json();
  if (data.error || !data.result) {
    return null;
  }

  return {
    blockNumber: data.result.blockNumber,
    from: data.result.from,
    to: data.result.to,
  };
}

/**
 * Fetch transfers for a specific transaction hash from Alchemy
 * First gets the transaction receipt to find the block, then fetches transfers from that block
 */
async function fetchTransfersByTxHash(
  txHash: string,
  apiKey: string,
  chain: string = "ethereum"
): Promise<any[]> {
  const apiUrl = getAlchemyApiUrl(chain);
  const url = `${apiUrl}/${apiKey}`;

  // First, try to get the transaction receipt to find the block number
  const receipt = await getTransactionReceipt(txHash, apiKey, chain);
  let fromBlock = "0x0";
  let toBlock = "latest";

  if (receipt?.blockNumber) {
    // Fetch transfers from the block containing this transaction
    const blockNum = parseInt(receipt.blockNumber, 16);
    fromBlock = `0x${(blockNum - 1).toString(16)}`; // Start from block before
    toBlock = `0x${(blockNum + 1).toString(16)}`; // End at block after
  }

  // Fetch transfers for this specific transaction
  // We fetch from both directions (from and to addresses) to catch all transfers
  const allTransfers: any[] = [];

  // Try fetching with the transaction's from address
  if (receipt?.from) {
    const paramsFrom: any = {
      category: ["external", "internal", "erc20", "erc721", "erc1155"],
      fromBlock,
      toBlock,
      fromAddress: receipt.from,
      withMetadata: true,
      order: "asc",
      maxCount: "0x3e8",
      excludeZeroValue: false,
    };

    const responseFrom = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        id: 1,
        jsonrpc: "2.0",
        method: "alchemy_getAssetTransfers",
        params: [paramsFrom],
      }),
    });

    if (responseFrom.ok) {
      const dataFrom = await responseFrom.json();
      if (!dataFrom.error && dataFrom.result?.transfers) {
        allTransfers.push(...dataFrom.result.transfers);
      }
    }
  }

  // Try fetching with the transaction's to address
  if (receipt?.to) {
    const paramsTo: any = {
      category: ["external", "internal", "erc20", "erc721", "erc1155"],
      fromBlock,
      toBlock,
      toAddress: receipt.to,
      withMetadata: true,
      order: "asc",
      maxCount: "0x3e8",
      excludeZeroValue: false,
    };

    const responseTo = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        id: 1,
        jsonrpc: "2.0",
        method: "alchemy_getAssetTransfers",
        params: [paramsTo],
      }),
    });

    if (responseTo.ok) {
      const dataTo = await responseTo.json();
      if (!dataTo.error && dataTo.result?.transfers) {
        allTransfers.push(...dataTo.result.transfers);
      }
    }
  }

  // If we didn't get a receipt, fall back to a wider search
  if (allTransfers.length === 0 && !receipt) {
    const params: any = {
      category: ["external", "internal", "erc20", "erc721", "erc1155"],
      fromBlock: "0x0",
      toBlock: "latest",
      withMetadata: true,
      order: "asc",
      maxCount: "0x3e8",
      excludeZeroValue: false,
    };

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        id: 1,
        jsonrpc: "2.0",
        method: "alchemy_getAssetTransfers",
        params: [params],
      }),
    });

    if (response.ok) {
      const data = await response.json();
      if (!data.error && data.result?.transfers) {
        allTransfers.push(...data.result.transfers);
      }
    }
  }

  // Filter transfers to only those matching the txHash and deduplicate
  const uniqueTransfers = Array.from(
    new Map(
      allTransfers
        .filter((t: any) => t.hash?.toLowerCase() === txHash.toLowerCase())
        .map((t: any) => [t.uniqueId || `${t.hash}-${t.from}-${t.to}`, t])
    ).values()
  );

  return uniqueTransfers;
}

/**
 * SECURITY: Debug endpoint - only available in development mode
 */
export async function GET(req: NextRequest) {
  // SECURITY: Block access in production
  const debugCheck = requireDebugAccess();
  if (debugCheck) {
    return debugCheck;
  }

  const { searchParams } = new URL(req.url);
  const txHash = searchParams.get("txHash");
  const chain = searchParams.get("chain") || "arbitrum";
  const address = searchParams.get("address"); // Optional: Simulate "who is the user"

  if (!txHash) {
    return NextResponse.json({ error: "Missing txHash param" }, { status: 400 });
  }

  try {
    const apiKey = getAlchemyApiKey();

    // 1. Fetch Raw Transfers from Alchemy for this specific transaction
    const transfers = await fetchTransfersByTxHash(txHash, apiKey, chain);

    if (transfers.length === 0) {
      return NextResponse.json({ 
        message: "No transfers found for this hash.",
        note: "The transaction may not exist, or it may not contain any asset transfers."
      }, { status: 404 });
    }

    // 2. Simulate the "User's Wallet"
    // If no address provided, we guess the "Sender" of the first transfer is the user
    const userAddress = address?.toLowerCase() || transfers[0].from?.toLowerCase();

    if (!userAddress) {
      return NextResponse.json({ 
        error: "Could not determine user address from transfers" 
      }, { status: 400 });
    }

    // 3. Get timestamp from the first transfer
    const timestamp = transfers[0]?.metadata?.blockTimestamp 
      ? new Date(transfers[0].metadata.blockTimestamp)
      : new Date();

    // 4. Run the parsing logic
    // Note: buildTradeFromTransfers requires userId and walletId, but for debugging we use placeholders
    const parsedTrade = await buildTradeFromTransfers(
      "debug-user-id", // Placeholder userId
      "debug-wallet-id", // Placeholder walletId
      userAddress,
      txHash,
      transfers,
      timestamp,
      chain
    );

    // 5. Test the price fetcher
    let debugPrice: number | null = null;
    if (parsedTrade) {
      const normalizedChain = chain.toLowerCase();
      console.log("Testing price fetch for:", normalizedChain, parsedTrade.timestamp);
      debugPrice = await getHistoricalNativePrice(normalizedChain, new Date(parsedTrade.timestamp));
    }

    return NextResponse.json({
      meta: {
        txHash,
        simulatedUser: userAddress,
        transferCount: transfers.length,
        chain,
        debugPrice, // Historical native token price fetched for testing
      },
      // This is the result of your new logic
      parsedResult: parsedTrade,
      // This helps you see what data the logic was working with
      rawTransfers: transfers.map(t => ({
        hash: t.hash,
        from: t.from,
        to: t.to,
        asset: t.asset,
        value: t.value,
        category: t.category,
        rawContract: {
          address: t.rawContract?.address,
          value: t.rawContract?.value,
          decimal: t.rawContract?.decimal,
          decimals: t.rawContract?.decimals,
        },
        blockNum: t.blockNum,
        uniqueId: t.uniqueId,
      }))
    });

  } catch (error: any) {
    console.error("Error parsing transaction:", error);
    return NextResponse.json({ 
      error: error.message, 
      stack: error.stack 
    }, { status: 500 });
  }
}

