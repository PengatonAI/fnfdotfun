import { SyncParams, SyncResult, CanonicalTradeInput } from "./types";
import { getTokenMetadata, getTokenSymbolSync, getTokenDecimalsSync } from "./token-metadata";
import { getHistoricalNativePrice } from "@/lib/price/historical";
import { setStage, setProgress } from "./sync-status";

/**
 * Sleep helper for rate limiting
 */
const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));

/**
 * Launch date timestamp (Unix timestamp in seconds)
 * Trades before this date will be skipped to optimize sync performance
 */
const LAUNCH_DATE_TIMESTAMP = new Date('2025-05-03T00:00:00Z').getTime() / 1000;

/**
 * Ethereum mainnet launch block (May 3, 2025)
 * Initial syncs for Ethereum will start from this block instead of block 0
 */
const ETH_LAUNCH_BLOCK_HEX = "0x155D635"; // Block 22403637 (May 3, 2025)
const ETH_LAUNCH_BLOCK_NUMBER = 22403637;

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
 * Get current block number from Alchemy
 */
async function getCurrentBlockNumber(
  apiKey: string,
  chain: string = "ethereum"
): Promise<number> {
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
      method: "eth_blockNumber",
      params: [],
    }),
  });

  if (!response.ok) {
    throw new Error(`Alchemy API error: ${response.status} ${response.statusText}`);
  }

  const data = await response.json();

  if (data.error) {
    throw new Error(`Alchemy API error: ${data.error.message || JSON.stringify(data.error)}`);
  }

  const blockNumberHex = data.result;
  return blockToNumber(blockNumberHex);
}

/**
 * Fetch transfers from Alchemy REST API
 */
async function fetchAlchemyTransfers(
  address: string,
  apiKey: string,
  fromBlock: string = "0x0",
  toBlock: string | number,
  chain: string = "ethereum",
  direction: "from" | "to" = "from"
): Promise<any[]> {
  const apiUrl = getAlchemyApiUrl(chain);
  const url = `${apiUrl}/${apiKey}`;

  // Convert toBlock to hex string if it's a number
  const toBlockHex = typeof toBlock === "number" ? blockToHex(toBlock) : toBlock;

  const params: any = {
    category: ["external", "internal", "erc20", "erc721", "erc1155"],
    fromBlock: fromBlock,
    toBlock: toBlockHex,
    withMetadata: true,
    order: "asc",
    maxCount: "0x3e8",
  };

  if (direction === "from") {
    params.fromAddress = address;
  } else {
    params.toAddress = address;
  }

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

  if (!response.ok) {
    throw new Error(`Alchemy API error: ${response.status} ${response.statusText}`);
  }

  const data = await response.json();

  if (data.error) {
    throw new Error(`Alchemy API error: ${data.error.message || JSON.stringify(data.error)}`);
  }

  return data.result?.transfers || [];
}

/**
 * Convert block number string to number
 */
function blockToNumber(block: string | number | null | undefined): number {
  if (!block) return 0;
  if (typeof block === "number") return block;
  if (typeof block === "string") {
    if (block.startsWith("0x")) {
      return parseInt(block, 16);
    }
    return parseInt(block, 10);
  }
  return 0;
}

/**
 * Convert block number to hex string
 */
function blockToHex(block: number | string): string {
  if (typeof block === "string" && block.startsWith("0x")) {
    return block;
  }
  const num = typeof block === "number" ? block : parseInt(block, 10);
  return `0x${num.toString(16)}`;
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
 * Get token address from transfer
 */
function getTokenAddress(transfer: any): string {
  if (isEthTransfer(transfer)) {
    return "0x0000000000000000000000000000000000000000"; // ETH address
  }
  return transfer.rawContract?.address?.toLowerCase() || "";
}

/**
 * Parse decimals from hex string (e.g., "0x12" = 18), decimal string, number, or null/undefined
 * Handles all Alchemy formats:
 * - "0x12" (hex string)
 * - "18" (decimal string)
 * - 18 (number)
 * - null/undefined (fallback to 18 for ETH and unknown tokens)
 */
function parseDecimals(rawDecimal: any): number {
  if (typeof rawDecimal === "string") {
    if (rawDecimal.startsWith("0x")) {
      return parseInt(rawDecimal, 16);
    }
    return parseInt(rawDecimal, 10);
  }
  if (typeof rawDecimal === "number") {
    return rawDecimal;
  }
  // Fallback for null, undefined, or any other type (e.g., ETH transfers)
  return 18;
}

/**
 * Get raw transfer amount as BigInt from smallest unit
 * Handles both raw BigInt values (from blockchain) and decimal numbers (from Alchemy)
 */
function getRawTransferAmount(transfer: any, decimals: number): bigint {
  const value = transfer.value || 0;
  
  try {
    // Case 1: Value is already a hex string (raw blockchain value)
    if (typeof value === "string" && value.startsWith("0x")) {
      return BigInt(value);
    }
    // Case 2: Value is a decimal number (from Alchemy's formatted response)
    else if (typeof value === "number" && value % 1 !== 0) {
      // Decimal number - multiply by 10^decimals to get smallest unit
      const multiplier = 10 ** decimals;
      const amountInSmallestUnit = Math.round(value * multiplier);
      return BigInt(amountInSmallestUnit);
    }
    // Case 3: Value is a string representation of a number (could be decimal)
    else if (typeof value === "string" && !value.startsWith("0x")) {
      const numVal = parseFloat(value);
      if (isNaN(numVal)) {
        throw new Error(`Invalid number string: ${value}`);
      }
      // Check if it's a decimal
      if (numVal % 1 !== 0) {
        const multiplier = 10 ** decimals;
        const amountInSmallestUnit = Math.round(numVal * multiplier);
        return BigInt(amountInSmallestUnit);
      } else {
        return BigInt(numVal);
      }
    }
    // Case 4: Value is already an integer (BigInt-compatible)
    else {
      // Try to convert directly - if it fails, treat as decimal
      try {
        return BigInt(value);
      } catch {
        // If BigInt conversion fails, try decimal conversion
        const numVal = typeof value === "number" ? value : parseFloat(String(value));
        if (isNaN(numVal)) {
          throw new Error(`Invalid value: ${value}`);
        }
        const multiplier = 10 ** decimals;
        const amountInSmallestUnit = Math.round(numVal * multiplier);
        return BigInt(amountInSmallestUnit);
      }
    }
  } catch (error) {
    console.error(`Error parsing transfer amount:`, { value, decimals, error });
    // Fallback: return 0
    return BigInt(0);
  }
}

/**
 * Normalize raw BigInt amount to decimal using decimals
 */
function normalizeAmount(rawAmount: bigint, decimals: number): number {
  const divisor = BigInt(10 ** decimals);
  const whole = rawAmount / divisor;
  const remainder = rawAmount % divisor;
  
  if (remainder === BigInt(0)) {
    return Number(whole);
  }
  
  // Convert to decimal
  const remainderNum = Number(remainder);
  const divisorNum = 10 ** decimals;
  const decimalPart = remainderNum / divisorNum;
  
  return Number(whole) + decimalPart;
}

/**
 * Get transfer amount as string (backward compatibility)
 */
function getTransferAmount(transfer: any): string {
  const decimalsRaw = transfer.rawContract?.decimal ?? transfer.rawContract?.decimals;
  const decimals = parseDecimals(decimalsRaw);
  const rawAmount = getRawTransferAmount(transfer, decimals);
  const normalized = normalizeAmount(rawAmount, decimals);
  return normalized.toString();
}

/**
 * Parse raw amount from transfer.rawContract.value
 * Handles hex strings (0x...) and decimal strings
 * Falls back to transfer.value for ETH transfers that might not have rawContract.value
 */
function parseRawAmountFromTransfer(transfer: any): bigint {
  // Try rawContract.value first (as per spec)
  let value = transfer.rawContract?.value;
  
  // Fallback to transfer.value for ETH transfers
  if (!value && (transfer.category === "external" || !transfer.rawContract?.address)) {
    value = transfer.value;
  }
  
  if (!value) {
    return BigInt(0);
  }
  
  try {
    // Case 1: Hex string (0x...)
    if (typeof value === "string" && value.startsWith("0x")) {
      return BigInt(value);
    }
    // Case 2: Decimal string or number
    if (typeof value === "string") {
      return BigInt(value);
    }
    if (typeof value === "number") {
      return BigInt(value);
    }
    // Case 3: Already BigInt
    if (typeof value === "bigint") {
      return value;
    }
    return BigInt(0);
  } catch (error) {
    console.error(`Error parsing raw amount:`, { value, error });
    return BigInt(0);
  }
}

/**
 * Build trade from grouped transfers
 * Exported for debugging purposes
 * 
 * PARSING SPECIFICATION:
 * - Uses transfer.rawContract.value (raw BigInt as string)
 * - Uses transfer.rawContract.decimal (correct decimals)
 * - Uses transfer.asset (correct token symbol for lowcaps)
 * - Ignores transfers involving 0x0 (fee reimbursements, etc.)
 * - Filters out dust transfers (< 1% of largest transfer in same direction)
 * - Determines tokenIn/tokenOut based on largest normalized amount after dust filtering
 * - Direction detection uses multiple heuristics:
 *   - Ratio of amounts (receiving much more = BUY, paying much more = SELL)
 *   - ETH token detection (paying ETH = BUY, receiving ETH = SELL)
 *   - Relative amounts (receiving more = BUY, paying more = SELL)
 * - Price = normalizedIn / normalizedOut (price per unit of tokenOut in terms of tokenIn)
 */
export async function buildTradeFromTransfers(
  userId: string,
  walletId: string,
  walletAddress: string,
  txHash: string,
  transfers: any[],
  timestamp: Date,
  chain: string = "ethereum"
): Promise<CanonicalTradeInput | null> {
  // Skip trades before launch date to optimize sync performance
  const timestampSeconds = timestamp.getTime() / 1000;
  if (timestampSeconds < LAUNCH_DATE_TIMESTAMP) {
    console.log(`Skipping trade ${txHash} - before launch date (${timestamp.toISOString()})`);
    return null;
  }
  
  const walletAddrLower = walletAddress.toLowerCase();
  const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";
  
  // Step 1: Classify incoming/outgoing transfers
  // Ignore transfers involving 0x0 (fee reimbursements etc)
  const incoming: any[] = [];
  const outgoing: any[] = [];
  
  // First pass: Identify outgoing transfers (from walletAddress)
  for (const transfer of transfers) {
    const from = transfer.from?.toLowerCase();
    const to = transfer.to?.toLowerCase();
    
    // Ignore transfers involving 0x0
    if (from === ZERO_ADDRESS || to === ZERO_ADDRESS) {
      continue;
    }
    
    if (from === walletAddrLower) {
      outgoing.push(transfer);
    }
  }
  
  // Second pass: Identify incoming transfers (to walletAddress) - normal case
  for (const transfer of transfers) {
    const from = transfer.from?.toLowerCase();
    const to = transfer.to?.toLowerCase();
    
    // Ignore transfers involving 0x0
    if (from === ZERO_ADDRESS || to === ZERO_ADDRESS) {
      continue;
    }
    
    if (to === walletAddrLower) {
      incoming.push(transfer);
    }
  }
  
  // Step 1.5: Handle Proxy/Bot trades where funds settle in contract address
  // If incoming is empty but outgoing has items, the user might be trading via a bot/contract
  // In this case, the contract receives the funds, not the user's EOA
  if (incoming.length === 0 && outgoing.length > 0) {
    // Identify the interactedAddress (the contract the user interacted with)
    // This is typically the 'to' address of the first outgoing transfer
    const interactedAddresses = new Set<string>();
    
    // Collect all unique 'to' addresses from outgoing transfers
    for (const transfer of outgoing) {
      const to = transfer.to?.toLowerCase();
      if (to && to !== walletAddrLower && to !== ZERO_ADDRESS) {
        interactedAddresses.add(to);
      }
    }
    
    // Look for transfers where 'to' matches one of the interacted addresses
    // These represent funds received by the bot/contract on behalf of the user
    for (const transfer of transfers) {
      const from = transfer.from?.toLowerCase();
      const to = transfer.to?.toLowerCase();
      
      // Ignore transfers involving 0x0
      if (from === ZERO_ADDRESS || to === ZERO_ADDRESS) {
        continue;
      }
      
      // If this transfer is TO an interacted address, treat it as incoming
      // This captures the case where the bot/contract receives tokens/ETH
      if (to && interactedAddresses.has(to)) {
        // Only add if it's not from the wallet (to avoid double-counting)
        if (from !== walletAddrLower) {
          incoming.push(transfer);
        }
      }
    }
  }
  
  // Need at least one incoming and one outgoing for a swap
  if (incoming.length === 0 || outgoing.length === 0) {
    return null;
  }
  
  // Step 2: Calculate normalized amounts for all transfers and filter out dust/fee transfers
  // Dust threshold: transfers smaller than 1% of the largest transfer in the same direction are considered dust
  
  const incomingWithAmounts = incoming.map(transfer => {
    const decimalsRaw = transfer.rawContract?.decimal ?? transfer.rawContract?.decimals;
    const decimals = parseDecimals(decimalsRaw);
    const rawAmount = parseRawAmountFromTransfer(transfer);
    const normalized = normalizeAmount(rawAmount, decimals);
    return { transfer, normalized, rawAmount, decimals };
  });
  
  const outgoingWithAmounts = outgoing.map(transfer => {
    const decimalsRaw = transfer.rawContract?.decimal ?? transfer.rawContract?.decimals;
    const decimals = parseDecimals(decimalsRaw);
    const rawAmount = parseRawAmountFromTransfer(transfer);
    const normalized = normalizeAmount(rawAmount, decimals);
    return { transfer, normalized, rawAmount, decimals };
  });
  
  // Find the largest transfer in each direction to establish dust threshold
  const maxIncoming = incomingWithAmounts.length > 0
    ? Math.max(...incomingWithAmounts.map(t => t.normalized))
    : 0;
  const maxOutgoing = outgoingWithAmounts.length > 0
    ? Math.max(...outgoingWithAmounts.map(t => t.normalized))
    : 0;
  
  // Filter out dust transfers (less than 1% of largest transfer in same direction)
  const DUST_THRESHOLD_RATIO = 0.01;
  const filteredIncoming = incomingWithAmounts.filter(t => 
    t.normalized >= maxIncoming * DUST_THRESHOLD_RATIO
  );
  const filteredOutgoing = outgoingWithAmounts.filter(t => 
    t.normalized >= maxOutgoing * DUST_THRESHOLD_RATIO
  );
  
  // Need at least one non-dust transfer in each direction
  if (filteredIncoming.length === 0 || filteredOutgoing.length === 0) {
    return null;
  }
  
  // Step 3: Determine primary tokenIn / tokenOut
  // If exactly one incoming + one outgoing after filtering, use that pair
  // Otherwise, use the largest normalized amounts (already filtered for dust)
  
  let tokenInTransfer: any = null;
  let tokenOutTransfer: any = null;
  
  if (filteredIncoming.length === 1 && filteredOutgoing.length === 1) {
    // Simple case: exactly one incoming + one outgoing after dust filtering
    tokenOutTransfer = filteredIncoming[0].transfer;
    tokenInTransfer = filteredOutgoing[0].transfer;
  } else {
    // Multiple transfers: find the largest normalized amounts (already filtered for dust)
    const largestIncoming = filteredIncoming.reduce((max, curr) => 
      curr.normalized > max.normalized ? curr : max
    );
    const largestOutgoing = filteredOutgoing.reduce((max, curr) => 
      curr.normalized > max.normalized ? curr : max
    );
    
    tokenOutTransfer = largestIncoming.transfer;
    tokenInTransfer = largestOutgoing.transfer;
  }
  
  if (!tokenInTransfer || !tokenOutTransfer) {
    return null;
  }
  
  // Step 4: Extract decimals
  // Use parseDecimals to handle all Alchemy formats: "0x12", "18", 18, null, undefined
  const decimalsIn = parseDecimals(tokenInTransfer.rawContract?.decimal ?? tokenInTransfer.rawContract?.decimals);
  const decimalsOut = parseDecimals(tokenOutTransfer.rawContract?.decimal ?? tokenOutTransfer.rawContract?.decimals);
  
  // Step 5: Parse raw amounts
  // rawAmount = BigInt(transfer.rawContract.value)
  // Ensure that "0x…" formats or decimal-format strings are supported.
  const rawAmountIn = parseRawAmountFromTransfer(tokenInTransfer);
  const rawAmountOut = parseRawAmountFromTransfer(tokenOutTransfer);
  
  // Step 6: Normalize
  // normalized = Number(rawAmount) / 10**decimals
  const normalizedAmountIn = normalizeAmount(rawAmountIn, decimalsIn);
  const normalizedAmountOut = normalizeAmount(rawAmountOut, decimalsOut);
  
  // Step 7: Determine direction (BUY vs SELL)
  // Heuristic: Compare normalized amounts and token addresses
  // - If normalizedAmountOut is significantly larger than normalizedAmountIn, likely BUY (receiving more tokens)
  // - If normalizedAmountIn is significantly larger than normalizedAmountOut, likely SELL (paying more tokens)
  // - If amounts are similar, check if one token is ETH (ETH is often the quote/paid token)
  // - Default to BUY if we can't determine (conservative approach)
  
  const ZERO_ADDRESS_LC = "0x0000000000000000000000000000000000000000";
  const tokenInAddressLC = getTokenAddress(tokenInTransfer).toLowerCase();
  const tokenOutAddressLC = getTokenAddress(tokenOutTransfer).toLowerCase();
  const isTokenInETH = tokenInAddressLC === ZERO_ADDRESS_LC;
  const isTokenOutETH = tokenOutAddressLC === ZERO_ADDRESS_LC;
  
  let direction: "BUY" | "SELL";
  
  // Calculate ratio to determine which side is larger
  const amountRatio = normalizedAmountOut > 0 ? normalizedAmountIn / normalizedAmountOut : 0;
  const reverseRatio = normalizedAmountIn > 0 ? normalizedAmountOut / normalizedAmountIn : 0;
  
  // Heuristic 1: If receiving significantly more tokens than paying, likely BUY
  // (e.g., receiving 1000 tokens, paying 1 token = BUY)
  if (reverseRatio > 10) {
    direction = "BUY";
  }
  // Heuristic 2: If paying significantly more tokens than receiving, likely SELL
  // (e.g., paying 1000 tokens, receiving 1 token = SELL)
  else if (amountRatio > 10) {
    direction = "SELL";
  }
  // Heuristic 3: If ETH is the token being paid (tokenIn), it's likely a BUY (buying with ETH)
  else if (isTokenInETH && !isTokenOutETH) {
    direction = "BUY";
  }
  // Heuristic 4: If ETH is the token being received (tokenOut), it's likely a SELL (selling for ETH)
  else if (isTokenOutETH && !isTokenInETH) {
    direction = "SELL";
  }
  // Heuristic 5: If receiving more tokens (normalized), likely BUY
  else if (normalizedAmountOut > normalizedAmountIn) {
    direction = "BUY";
  }
  // Heuristic 6: If paying more tokens (normalized), likely SELL
  else if (normalizedAmountIn > normalizedAmountOut) {
    direction = "SELL";
  }
  // Fallback: default to BUY (conservative)
  else {
    direction = "BUY";
  }
  
  // Step 8: Extract symbols from transfer.asset
  // Use transfer.asset (correct token symbol for lowcaps)
  // Do NOT use static symbol maps.
  const tokenInSymbol = tokenInTransfer.asset || null;
  const tokenOutSymbol = tokenOutTransfer.asset || null;
  
  // Get token addresses
  // Use getTokenAddress helper which handles ETH transfers correctly
  const tokenInAddress = getTokenAddress(tokenInTransfer);
  const tokenOutAddress = getTokenAddress(tokenOutTransfer);
  
  // Step 9: Determine display asset based on direction
  // For SELL: Display the token being sold (tokenIn)
  // For BUY: Display the token being received (tokenOut)
  let displayTokenSymbol: string | null;
  let displayTokenAddress: string;
  let displayAmount: number;
  let counterAmount: number;
  
  if (direction === "SELL") {
    // SELL: Display the token being sold (tokenIn)
    displayTokenSymbol = tokenInSymbol;
    displayTokenAddress = tokenInAddress;
    displayAmount = normalizedAmountIn;
    counterAmount = normalizedAmountOut;
  } else {
    // BUY: Display the token being received (tokenOut)
    displayTokenSymbol = tokenOutSymbol;
    displayTokenAddress = tokenOutAddress;
    displayAmount = normalizedAmountOut;
    counterAmount = normalizedAmountIn;
  }
  
  // Step 10: Compute price
  // price = counterAmount / displayAmount
  // This ensures price is always "Counter-token per Display-token"
  // For SELL: price = tokenOut / tokenIn (e.g., ETH per MSIA)
  // For BUY: price = tokenIn / tokenOut (e.g., USDC per ETH)
  const price = displayAmount > 0 && counterAmount > 0 
    ? counterAmount / displayAmount 
    : null;
  
  // For backward compatibility with CanonicalTradeInput interface, we still need baseTokenAddress and quoteTokenAddress
  // But these are legacy fields - the new model uses tokenInAddress and tokenOutAddress
  // For BUY: base = tokenOut (what we receive), quote = tokenIn (what we pay)
  // For SELL: base = tokenIn (what we receive), quote = tokenOut (what we pay)
  const baseTokenAddress = direction === "BUY" ? tokenOutAddress : tokenInAddress;
  const quoteTokenAddress = direction === "BUY" ? tokenInAddress : tokenOutAddress;
  
  // Legacy fields for backward compatibility (will not be used in DB writes)
  const baseAmount = direction === "BUY" ? rawAmountOut.toString() : rawAmountIn.toString();
  const quoteAmount = direction === "BUY" ? rawAmountIn.toString() : rawAmountOut.toString();
  
  // Detect platform (simplified - would need transaction analysis for accurate detection)
  const platform = "unknown";
  
  // Fetch native price with error handling to prevent rate limit failures from stopping sync
  let nativePrice: number | null = null;
  try {
    nativePrice = await getHistoricalNativePrice(chain, new Date(timestamp));
    console.log(`Fetched nativePrice for trade ${txHash}:`, nativePrice, `(chain: ${chain}, timestamp: ${timestamp.toISOString()})`);
  } catch (error) {
    console.error(`❌ Failed to fetch nativePrice for trade ${txHash} (chain: ${chain}, timestamp: ${timestamp.toISOString()}):`, error);
    // Continue processing with null nativePrice - USD calculations will be skipped
    nativePrice = null;
  }

  // Step 11: Calculate USD values for proof system
  // Determine counter token symbol (the token paired against the display token)
  const counterSymbol = direction === "SELL" ? tokenOutSymbol : tokenInSymbol;
  
  // Define stablecoin and native token lists
  const stablecoinSymbols = ["USDC", "USDT", "DAI", "BUSD", "TUSD", "USDP", "FRAX", "LUSD"];
  const nativeTokenSymbols = ["ETH", "WETH"];
  const counterSymbolUpper = counterSymbol?.toUpperCase() || "";
  const isStablecoin = stablecoinSymbols.includes(counterSymbolUpper);
  const isNative = nativeTokenSymbols.includes(counterSymbolUpper);
  
  // Determine price multiplier based on counter token type
  let priceMultiplier: number | null = null;
  if (isStablecoin) {
    // For stablecoin trades, use 1.0 as the multiplier
    priceMultiplier = 1.0;
  } else if (isNative && nativePrice != null && nativePrice > 0) {
    // For native token trades (ETH, WETH), use nativePrice
    priceMultiplier = nativePrice;
  } else {
    // If nativePrice is missing and it's not a stablecoin or native token, we can't calculate USD
    priceMultiplier = null;
  }
  
  // Calculate USD price per token and total USD value
  let usdPricePerToken: number | null = null;
  let usdValue: number | null = null;
  
  if (price != null && priceMultiplier != null && displayAmount != null) {
    // Calculate USD price per display token
    usdPricePerToken = price * priceMultiplier;
    
    // Calculate total USD value of the trade
    if (usdPricePerToken > 0) {
      usdValue = displayAmount * usdPricePerToken;
    }
  }

  return {
    userId,
    walletId,
    walletAddress: walletAddress.toLowerCase(),
    chain: "evm",
    platform,
    direction,
    // Legacy fields (kept for interface compatibility, but not used in DB writes)
    baseTokenAddress,
    quoteTokenAddress,
    baseAmount,
    quoteAmount,
    // New parsed fields (these are what we use)
    tokenInSymbol,
    tokenOutSymbol,
    tokenNameIn: null,
    tokenNameOut: null,
    normalizedAmountIn,
    normalizedAmountOut,
    decimalsIn,
    decimalsOut,
    price,
    // CRITICAL FIX: explicitly including the fetched nativePrice
    nativePrice: nativePrice,
    // USD proof system fields (calculated and stored permanently)
    usdPricePerToken: usdPricePerToken,
    usdValue: usdValue,
    feeAmount: null,
    feeTokenAddress: null,
    txHash,
    txIndex: tokenOutTransfer.logIndex || null,
    timestamp,
    raw: {
      transfers,
      txHash,
      // Display fields for UI (computed based on direction)
      displayTokenSymbol,
      displayTokenAddress,
      displayAmount,
      counterAmount,
    },
    // New fields for direct access
    tokenInAddress,
    tokenOutAddress,
  };
}

/**
 * Sync EVM wallet trades using Alchemy
 */
export async function syncEvmWalletTrades(
  params: SyncParams & { walletId: string; chain?: string }
): Promise<SyncResult> {
  const { userId, walletAddress, lastSyncedCursor, walletId, chain = "ethereum" } = params;
  
  try {
    console.log('Syncing wallet:', walletAddress);
    
    const apiKey = getAlchemyApiKey();
    
    // Check if cursor is valid (not null, not "0", not "0x0")
    // Reset script sets cursor to "0", which we should treat as invalid
    const hasValidCursor = lastSyncedCursor && lastSyncedCursor !== "0" && lastSyncedCursor !== "0x0";
    
    // Parse lastSyncedCursor to block number if valid
    const lastSyncedBlock = hasValidCursor ? blockToNumber(lastSyncedCursor!) : null;
    
    // Step 1: Calculate fromBlock with safety margin
    // Start from next block after last synced block, with safety margin of 5 blocks
    // (Alchemy sometimes lags, so we go back 5 blocks to catch any missed transfers)
    // For initial syncs, use launch block for Ethereum to optimize performance
    let fromBlock: number;
    if (lastSyncedBlock && lastSyncedBlock > 0) {
      // Continue from last synced block with safety margin
      fromBlock = Math.max(0, lastSyncedBlock - 5);  // Safety margin: go back 5 blocks, but never below 0
    } else {
      // Initial sync: use launch block for Ethereum, block 0 for other chains
      if (chain.toLowerCase() === "ethereum" || chain.toLowerCase() === "eth" || chain.toLowerCase() === "mainnet" || chain.toLowerCase() === "evm") {
        fromBlock = ETH_LAUNCH_BLOCK_NUMBER;
      } else {
        fromBlock = 0;  // Other chains start from block 0
      }
    }
    
    // Step 2: Explicitly fetch current chain tip (toBlock)
    // Do not rely on implicit "latest" behavior - we need an explicit block number for cursor tracking
    const toBlock = await getCurrentBlockNumber(apiKey, chain);
    
    // Log the block range we're syncing (use fromBlock for accurate logging)
    console.log(`Syncing blocks: ${fromBlock} to ${toBlock} (chain: ${chain})`);
    
    // If fromBlock is greater than or equal to toBlock, we're already up to date
    if (fromBlock >= toBlock) {
      console.log(`Already synced up to block ${toBlock}, no new blocks to process`);
      return {
        newTrades: 0,
        transfersFetched: 0,
        lastSyncedCursor: blockToHex(toBlock),
      };
    }
    
    // Convert fromBlock to hex, using launch block hex for Ethereum initial syncs
    let fromBlockHex: string;
    if (fromBlock === 0) {
      fromBlockHex = "0x0";
    } else if (fromBlock === ETH_LAUNCH_BLOCK_NUMBER && (chain.toLowerCase() === "ethereum" || chain.toLowerCase() === "eth" || chain.toLowerCase() === "mainnet" || chain.toLowerCase() === "evm")) {
      fromBlockHex = ETH_LAUNCH_BLOCK_HEX;
    } else {
      fromBlockHex = blockToHex(fromBlock);
    }
    
    // Step 3: Fetch transfers using TWO separate REST API calls with explicit toBlock
    // 1. Fetch transfers FROM wallet
    const fromTransfers = await fetchAlchemyTransfers(
      walletAddress,
      apiKey,
      fromBlockHex,
      toBlock,
      chain,
      "from"
    );
    
    // 2. Fetch transfers TO wallet
    const toTransfers = await fetchAlchemyTransfers(
      walletAddress,
      apiKey,
      fromBlockHex,
      toBlock,
      chain,
      "to"
    );
    
    console.log(`Fetched transfers FROM wallet: ${fromTransfers.length}`);
    console.log(`Fetched transfers TO wallet: ${toTransfers.length}`);
    
    // Combine both sets and deduplicate using uniqueId (matching diagnostic)
    const allTransfers = [...fromTransfers, ...toTransfers];
    const uniqueTransfers = Array.from(
      new Map(
        allTransfers.map((t) => [
          t.uniqueId || `${t.hash}-${t.from}-${t.to}`,
          t,
        ])
      ).values()
    );
    console.log(`Total unique transfers: ${uniqueTransfers.length}`);
    
    // Progress: After fetching transfers
    setStage("fetched-transfers", `Fetched ${uniqueTransfers.length} transfers`);
    
    // Group transfers by transaction hash
    const transfersByTx = new Map<string, any[]>();
    for (const transfer of uniqueTransfers) {
      const txHash = transfer.hash;
      if (!transfersByTx.has(txHash)) {
        transfersByTx.set(txHash, []);
      }
      transfersByTx.get(txHash)!.push(transfer);
    }
    
    console.log(`Grouped into ${transfersByTx.size} unique transactions`);
    
    // Build trades from grouped transfers
    const tradesMap = new Map<string, CanonicalTradeInput>();
    const txEntries = Array.from(transfersByTx.entries());
    const totalTrades = txEntries.length;
    
    // Progress: When swaps detected
    if (totalTrades > 0) {
      setProgress(0, totalTrades, `Detected ${totalTrades} potential swaps`);
      setStage("parsing-trades", `Processing ${totalTrades} transactions`);
    }
    
    for (let i = 0; i < txEntries.length; i++) {
      const [txHash, txTransfers] = txEntries[i];
      
      // Rate limiting: wait 300ms before processing each trade to avoid API rate limits
      if (i > 0) {
        await sleep(300);
      }
      
      console.log(`Processing trade ${i + 1}/${totalTrades}...`);
      
      // Progress: Inside trade processing loop
      setProgress(i + 1, totalTrades, `Processing trade ${i + 1}/${totalTrades}`);
      
      // Only build trade if we have both incoming and outgoing transfers
      const walletAddrLower = walletAddress.toLowerCase();
      const hasIncoming = txTransfers.some((t: any) => t.to?.toLowerCase() === walletAddrLower);
      const hasOutgoing = txTransfers.some((t: any) => t.from?.toLowerCase() === walletAddrLower);
      
      if (!hasIncoming || !hasOutgoing) {
        continue; // Skip if not a swap pattern
      }
      
      // Get timestamp from first transfer
      const timestamp = txTransfers[0]?.metadata?.blockTimestamp 
        ? new Date(txTransfers[0].metadata.blockTimestamp)
        : new Date();
      
      // Skip trades before launch date to optimize sync performance
      const timestampSeconds = timestamp.getTime() / 1000;
      if (timestampSeconds < LAUNCH_DATE_TIMESTAMP) {
        console.log(`Skipping trade ${txHash} - before launch date (${timestamp.toISOString()})`);
        continue;
      }
      
      const trade = await buildTradeFromTransfers(
        userId,
        walletId,
        walletAddress,
        txHash,
        txTransfers,
        timestamp,
        chain
      );
      
      if (trade) {
        const key = `${trade.txHash}-${trade.txIndex ?? 0}`;
        if (!tradesMap.has(key)) {
          tradesMap.set(key, trade);
        }
      }
    }
    
    const trades = Array.from(tradesMap.values());
    console.log(`Fetched ${uniqueTransfers.length} transfers, detected ${trades.length} swaps`);
    
    // Progress: After parsing trades, before saving
    if (trades.length > 0) {
      setStage("saving-trades", `Saving ${trades.length} trades to database`);
    }
    
    // Step 4: Update cursor to the toBlock we just queried
    // CRITICAL: Always update cursor to toBlock, even if no transfers were found
    // This ensures we don't re-scan the same blocks forever
    // The cursor represents "we have processed all events up to and including this block"
    const newCursor = blockToHex(toBlock);
    
    console.log(`Updating cursor to block ${toBlock} (${newCursor})`);
    
    return {
      newTrades: trades.length,
      transfersFetched: uniqueTransfers.length,
      lastSyncedCursor: newCursor,
    };
  } catch (error) {
    console.error("Error syncing EVM trades:", error);
    throw error;
  }
}

/**
 * Export trades for persistence
 */
export async function getEvmTrades(
  params: SyncParams & { chain?: string },
  walletId: string
): Promise<CanonicalTradeInput[]> {
  const { userId, walletAddress, lastSyncedCursor, chain = "ethereum" } = params;
  
  console.log('Getting trades for wallet:', walletAddress);
  
  const apiKey = getAlchemyApiKey();
  
  // Check if cursor is valid (not null, not "0", not "0x0")
  // Reset script sets cursor to "0", which we should treat as invalid
  const hasValidCursor = lastSyncedCursor && lastSyncedCursor !== "0" && lastSyncedCursor !== "0x0";
  
  // Parse lastSyncedCursor to block number if valid
  const lastSyncedBlock = hasValidCursor ? blockToNumber(lastSyncedCursor!) : null;
  
  // Start from next block after last synced block, with safety margin of 5 blocks
  // (Alchemy sometimes lags, so we go back 5 blocks to catch any missed transfers)
  // For initial syncs, use launch block for Ethereum to optimize performance
  let fromBlock: number;
  if (lastSyncedBlock && lastSyncedBlock > 0) {
    // Continue from last synced block with safety margin
    fromBlock = Math.max(0, lastSyncedBlock - 5);  // Safety margin: go back 5 blocks, but never below 0
  } else {
    // Initial sync: use launch block for Ethereum, block 0 for other chains
    if (chain.toLowerCase() === "ethereum" || chain.toLowerCase() === "eth" || chain.toLowerCase() === "mainnet" || chain.toLowerCase() === "evm") {
      fromBlock = ETH_LAUNCH_BLOCK_NUMBER;
    } else {
      fromBlock = 0;  // Other chains start from block 0
    }
  }
  
  // Convert fromBlock to hex, using launch block hex for Ethereum initial syncs
  let fromBlockHex: string;
  if (fromBlock === 0) {
    fromBlockHex = "0x0";
  } else if (fromBlock === ETH_LAUNCH_BLOCK_NUMBER && (chain.toLowerCase() === "ethereum" || chain.toLowerCase() === "eth" || chain.toLowerCase() === "mainnet" || chain.toLowerCase() === "evm")) {
    fromBlockHex = ETH_LAUNCH_BLOCK_HEX;
  } else {
    fromBlockHex = blockToHex(fromBlock);
  }
  
  // Explicitly fetch current chain tip (toBlock)
  const toBlock = await getCurrentBlockNumber(apiKey, chain);
  
  // Log the block range (use fromBlock for accurate logging)
  console.log(`Getting trades for blocks: ${fromBlock} to ${toBlock} (chain: ${chain})`);
  
  // Fetch transfers using TWO separate REST API calls with explicit toBlock
  // 1. Fetch transfers FROM wallet
  const fromTransfers = await fetchAlchemyTransfers(
    walletAddress,
    apiKey,
    fromBlockHex,
    toBlock,
    chain,
    "from"
  );
  
  // 2. Fetch transfers TO wallet
  const toTransfers = await fetchAlchemyTransfers(
    walletAddress,
    apiKey,
    fromBlockHex,
    toBlock,
    chain,
    "to"
  );
  
  // Combine both sets and deduplicate using uniqueId (matching diagnostic)
  const allTransfers = [...fromTransfers, ...toTransfers];
  const uniqueTransfers = Array.from(
    new Map(
      allTransfers.map((t) => [
        t.uniqueId || `${t.hash}-${t.from}-${t.to}`,
        t,
      ])
    ).values()
  );
  
  // Group by transaction hash
  const transfersByTx = new Map<string, any[]>();
  for (const transfer of uniqueTransfers) {
    const txHash = transfer.hash;
    if (!transfersByTx.has(txHash)) {
      transfersByTx.set(txHash, []);
    }
    transfersByTx.get(txHash)!.push(transfer);
  }
  
  const tradesMap = new Map<string, CanonicalTradeInput>();
  const txEntries = Array.from(transfersByTx.entries());
  const totalTrades = txEntries.length;
  
  // Progress: When swaps detected in getEvmTrades
  if (totalTrades > 0) {
    setProgress(0, totalTrades, `Detected ${totalTrades} potential swaps`);
    setStage("parsing-trades", `Processing ${totalTrades} transactions`);
  }
  
  for (let i = 0; i < txEntries.length; i++) {
    const [txHash, txTransfers] = txEntries[i];
    
    // Rate limiting: wait 300ms before processing each trade to avoid API rate limits
    if (i > 0) {
      await sleep(300);
    }
    
    console.log(`Processing trade ${i + 1}/${totalTrades}...`);
    
    // Progress: Inside trade processing loop in getEvmTrades
    setProgress(i + 1, totalTrades, `Processing trade ${i + 1}/${totalTrades}`);
    
    const walletAddrLower = walletAddress.toLowerCase();
    const hasIncoming = txTransfers.some((t: any) => t.to?.toLowerCase() === walletAddrLower);
    const hasOutgoing = txTransfers.some((t: any) => t.from?.toLowerCase() === walletAddrLower);
    
    if (!hasIncoming || !hasOutgoing) {
      continue;
    }
    
    const timestamp = txTransfers[0]?.metadata?.blockTimestamp 
      ? new Date(txTransfers[0].metadata.blockTimestamp)
      : new Date();
    
    // Skip trades before launch date to optimize sync performance
    const timestampSeconds = timestamp.getTime() / 1000;
    if (timestampSeconds < LAUNCH_DATE_TIMESTAMP) {
      console.log(`Skipping trade ${txHash} - before launch date (${timestamp.toISOString()})`);
      continue;
    }
    
    const trade = await buildTradeFromTransfers(
      userId,
      walletId,
      walletAddress,
      txHash,
      txTransfers,
      timestamp,
      chain
    );
    
    if (trade) {
      const key = `${trade.txHash}-${trade.txIndex ?? 0}`;
      if (!tradesMap.has(key)) {
        tradesMap.set(key, trade);
      }
    }
  }
  
  const trades = Array.from(tradesMap.values());
  console.log('Built trades:', trades.length);
  
  // Progress: After parsing trades in getEvmTrades, before saving
  if (trades.length > 0) {
    setStage("saving-trades", `Saving ${trades.length} trades to database`);
  }
  
  return trades;
}
