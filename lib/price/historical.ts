/**
 * Fetch historical native token prices from CryptoCompare API
 */

/**
 * Mapping of chain names to CryptoCompare symbol IDs
 * Maps chain identifiers to their native token symbols for price lookups
 */
const CHAIN_TO_SYMBOL: Record<string, string> = {
  // Ethereum and EVM chains that use ETH for gas
  ethereum: "ETH",
  eth: "ETH",
  mainnet: "ETH",
  arbitrum: "ETH",
  "arbitrum-one": "ETH",
  base: "ETH",
  optimism: "ETH",
  op: "ETH",
  // Polygon uses MATIC for gas
  polygon: "MATIC",
  matic: "MATIC",
  // BSC uses BNB for gas
  bsc: "BNB",
  binance: "BNB",
  // Solana
  solana: "SOL",
  sol: "SOL",
  // Avalanche uses AVAX for gas
  avalanche: "AVAX",
  avax: "AVAX",
};

/**
 * Get CryptoCompare symbol for a given chain name
 * 
 * @param chain - Chain name (case-insensitive)
 * @returns CryptoCompare symbol (e.g., "ETH", "SOL", "MATIC")
 * @throws Error if chain is invalid and no default can be determined
 */
function getChainSymbol(chain: string): string {
  if (!chain || typeof chain !== "string") {
    console.warn(`Invalid chain parameter: ${chain}, defaulting to ETH`);
    return "ETH";
  }

  const chainLower = chain.toLowerCase().trim();
  const symbol = CHAIN_TO_SYMBOL[chainLower];

  if (symbol) {
    return symbol;
  }

  // Default to ETH for unknown EVM chains (most common case)
  console.warn(`Unknown chain "${chain}", defaulting to ETH`);
  return "ETH";
}

/**
 * Get historical USD price of a chain's native token at a specific date
 * 
 * @param chain - Chain name (e.g., "ethereum", "arbitrum", "solana")
 * @param date - Date object representing when the trade occurred
 * @returns USD price of the native token, or null if fetch fails
 */
export async function getHistoricalNativePrice(
  chain: string,
  date: Date
): Promise<number | null> {
  // Validate inputs
  if (!chain || typeof chain !== "string") {
    console.error(`Invalid chain parameter: ${chain}`);
    return null;
  }

  if (!date || !(date instanceof Date) || isNaN(date.getTime())) {
    console.error(`Invalid date parameter: ${date}`);
    return null;
  }

  try {
    // 1. Convert chain name to CryptoCompare symbol
    const symbol = getChainSymbol(chain);
    
    // 2. Convert JS Date to Unix timestamp (seconds)
    // CRITICAL: API expects seconds, not milliseconds
    const ts = Math.floor(date.getTime() / 1000);
    
    // Validate timestamp is reasonable (not in the future, not too old)
    const now = Math.floor(Date.now() / 1000);
    if (ts > now) {
      console.warn(`Date ${date.toISOString()} is in the future, using current price`);
    }
    
    // 3. Fetch from CryptoCompare's free API
    const url = `https://min-api.cryptocompare.com/data/pricehistorical?fsym=${symbol}&tsyms=USD&ts=${ts}`;
    
    // Log before fetch for debugging
    console.log(`Fetching price for ${symbol} at ${ts}...`);
    
    const response = await fetch(url, {
      method: "GET",
      headers: {
        "Accept": "application/json",
      },
    });
    
    if (!response.ok) {
      console.error(
        `CryptoCompare API error for ${chain} (${symbol}): ${response.status} ${response.statusText}`
      );
      // Will fall through to fallback logic below
    } else {
      try {
        const data = await response.json();
        
        // CryptoCompare returns data in format: { "ETH": { "USD": 2500.50 } }
        if (data && typeof data === "object" && data[symbol] && data[symbol].USD) {
          // 4. Extract and validate the USD value
          const usdPrice = data[symbol].USD;
          
          if (typeof usdPrice === "number" && !isNaN(usdPrice) && usdPrice > 0) {
            console.log(
              `Successfully fetched historical price for ${chain} (${symbol}): $${usdPrice} at ${date.toISOString()}`
            );
            
            return usdPrice;
          }
        }
      } catch (parseError) {
        console.error(`Error parsing historical price response for ${chain} (${symbol}):`, parseError);
        // Will fall through to fallback logic below
      }
    }
    
    // Historical price fetch failed or returned invalid data
    // Check if trade is within last 24 hours for fallback
    const hoursAgo = (now - ts) / 3600;
    
    if (hoursAgo <= 24 && hoursAgo >= 0) {
      // Trade is within last 24 hours, try current price as fallback
      console.log(`Using current price fallback for ${chain} (trade was ${hoursAgo.toFixed(2)}h ago)`);
      
      try {
        const currentPriceUrl = `https://min-api.cryptocompare.com/data/price?fsym=${symbol}&tsyms=USD`;
        
        const currentResponse = await fetch(currentPriceUrl, {
          method: "GET",
          headers: {
            "Accept": "application/json",
          },
        });
        
        if (currentResponse.ok) {
          const currentData = await currentResponse.json();
          
          // Current price API returns format: { "USD": 2500.50 } (not nested by symbol)
          if (currentData && currentData.USD) {
            const currentPrice = currentData.USD;
            
            if (typeof currentPrice === "number" && !isNaN(currentPrice) && currentPrice > 0) {
              console.log(
                `Successfully fetched current price fallback for ${chain} (${symbol}): $${currentPrice}`
              );
              
              return currentPrice;
            }
          }
        }
        
        console.warn(`Current price fallback also failed for ${chain} (${symbol})`);
      } catch (fallbackError) {
        console.error(`Error fetching current price fallback for ${chain}:`, fallbackError);
      }
    } else {
      console.warn(
        `Historical price unavailable for ${chain} (${symbol}) at ${date.toISOString()}, and trade is ${hoursAgo.toFixed(2)}h ago (outside 24h window)`
      );
    }
    
    // Both historical and current price fetches failed
    return null;
  } catch (error) {
    // Enhanced error logging for server terminal visibility
    const errorMessage = error instanceof Error ? error.message : String(error);
    const errorStack = error instanceof Error ? error.stack : undefined;
    
    console.error("=".repeat(60));
    console.error("❌ ERROR: Failed to fetch historical price");
    console.error(`Chain: ${chain}`);
    console.error(`Date: ${date.toISOString()}`);
    console.error(`Timestamp: ${Math.floor(date.getTime() / 1000)}`);
    console.error(`Error: ${errorMessage}`);
    
    if (errorStack) {
      console.error("Stack trace:");
      console.error(errorStack);
    }
    
    if (error instanceof Error && error.cause) {
      console.error("Error cause:", error.cause);
    }
    
    console.error("=".repeat(60));
    
    return null;
  }
}

