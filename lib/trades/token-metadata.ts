/**
 * Token metadata interface
 */
interface TokenMetadata {
  symbol: string;
  decimals: number;
  name: string;
  chain?: string;
}

/**
 * In-memory cache for token metadata
 */
const metadataCache = new Map<string, TokenMetadata>();

/**
 * Chain-specific token metadata maps
 */
const ETHEREUM_TOKENS: Record<string, TokenMetadata> = {
  // ETH and Native
  "0x0000000000000000000000000000000000000000": { symbol: "ETH", decimals: 18, name: "Ethereum" },
  "0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee": { symbol: "ETH", decimals: 18, name: "Ethereum" },

  // Stablecoins
  "0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48": { symbol: "USDC", decimals: 6, name: "USD Coin" },
  "0xdac17f958d2ee523a2206206994597c13d831ec7": { symbol: "USDT", decimals: 6, name: "Tether USD" },
  "0x6b175474e89094c44da98b954eedeac495271d0f": { symbol: "DAI", decimals: 18, name: "Dai Stablecoin" },

  // Common Tokens
  "0x2260fac5e5542a773aa44fbcfedf7c193bc2c599": { symbol: "WBTC", decimals: 8, name: "Wrapped Bitcoin" },
  "0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2": { symbol: "WETH", decimals: 18, name: "Wrapped Ether" },
  "0x7fc66500c84a76ad7e9c93437bfc5ac33e2ddae9": { symbol: "AAVE", decimals: 18, name: "Aave Token" },
  "0x514910771af9ca656af840dff83e8264ecf986ca": { symbol: "LINK", decimals: 18, name: "Chainlink" },
  "0x1f9840a85d5af5bf1d1762f925bdaddc4201f984": { symbol: "UNI", decimals: 18, name: "Uniswap" },
  "0x95ad61b0a150d79219dcf64e1e6cc01f0b64c4ce": { symbol: "SHIB", decimals: 18, name: "Shiba Inu" },
};

const BASE_TOKENS: Record<string, TokenMetadata> = {
  "0x0000000000000000000000000000000000000000": { symbol: "ETH", decimals: 18, name: "Ethereum" },
  "0x833589fcd6edb6e08f4c7c32d4f71b54bda02913": { symbol: "USDC", decimals: 6, name: "USD Coin" },
};

const ARBITRUM_TOKENS: Record<string, TokenMetadata> = {
  "0x0000000000000000000000000000000000000000": { symbol: "ETH", decimals: 18, name: "Ethereum" },
  "0xff970a61a04b1ca14834a43f5de4533ebddb5cc8": { symbol: "USDC", decimals: 6, name: "USD Coin" },
  "0xfd086bc7cd5c481dcc9c85ebe478a1c0b69fcbb9": { symbol: "USDT", decimals: 6, name: "Tether USD" },
};

const OPTIMISM_TOKENS: Record<string, TokenMetadata> = {
  "0x0000000000000000000000000000000000000000": { symbol: "ETH", decimals: 18, name: "Ethereum" },
  "0x7f5c764cbc14f9669b88837ca1490cca17c31607": { symbol: "USDC", decimals: 6, name: "USD Coin" },
};

const POLYGON_TOKENS: Record<string, TokenMetadata> = {
  "0x0000000000000000000000000000000000000000": { symbol: "MATIC", decimals: 18, name: "Polygon" },
  "0x2791bca1f2de4661ed88a30c99a7a9449aa84174": { symbol: "USDC", decimals: 6, name: "USD Coin" },
  "0xc2132d05d31c914a87c6611c10748aeb04b58e8f": { symbol: "USDT", decimals: 6, name: "Tether USD" },
};

/**
 * Get chain-specific token metadata map
 */
function getChainTokens(chain: string): Record<string, TokenMetadata> {
  const chainLower = chain.toLowerCase();
  
  if (chainLower === "base") {
    return BASE_TOKENS;
  } else if (chainLower === "arbitrum" || chainLower === "arb") {
    return ARBITRUM_TOKENS;
  } else if (chainLower === "optimism" || chainLower === "op") {
    return OPTIMISM_TOKENS;
  } else if (chainLower === "polygon" || chainLower === "matic") {
    return POLYGON_TOKENS;
  }
  
  // Default to Ethereum
  return ETHEREUM_TOKENS;
}

/**
 * Fetch token metadata from Alchemy API (fallback)
 */
async function fetchTokenMetadataFromAlchemy(
  address: string,
  chain: string = "ethereum"
): Promise<TokenMetadata | null> {
  try {
    const apiKey = process.env.ALCHEMY_API_KEY;
    if (!apiKey) {
      return null;
    }

    // Map chain to Alchemy network
    const networkMap: Record<string, string> = {
      ethereum: "eth-mainnet",
      base: "base-mainnet",
      arbitrum: "arb-mainnet",
      optimism: "opt-mainnet",
      polygon: "polygon-mainnet",
    };

    const network = networkMap[chain.toLowerCase()] || "eth-mainnet";
    const url = `https://${network}.g.alchemy.com/v2/${apiKey}`;

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        id: 1,
        jsonrpc: "2.0",
        method: "alchemy_getTokenMetadata",
        params: [address],
      }),
    });

    if (!response.ok) {
      return null;
    }

    const data = await response.json();
    if (data.error || !data.result) {
      return null;
    }

    const result = data.result;
    return {
      symbol: result.symbol || "UNKNOWN",
      decimals: result.decimals || 18,
      name: result.name || result.symbol || "Unknown Token",
    };
  } catch (error) {
    console.error(`Error fetching token metadata from Alchemy for ${address}:`, error);
    return null;
  }
}

/**
 * Get token metadata (chain-sensitive with fallback to Alchemy)
 */
export async function getTokenMetadata(
  address: string | null | undefined,
  chain: string = "ethereum"
): Promise<TokenMetadata> {
  if (!address) {
    return { symbol: "UNKNOWN", decimals: 18, name: "Unknown Token" };
  }

  const addrLower = address.toLowerCase();
  const cacheKey = `${chain}:${addrLower}`;

  // Check cache first
  if (metadataCache.has(cacheKey)) {
    return metadataCache.get(cacheKey)!;
  }

  // Check chain-specific static map
  const chainTokens = getChainTokens(chain);
  if (chainTokens[addrLower]) {
    const metadata = { ...chainTokens[addrLower], chain };
    metadataCache.set(cacheKey, metadata);
    return metadata;
  }

  // Fallback to Alchemy API
  const alchemyMetadata = await fetchTokenMetadataFromAlchemy(addrLower, chain);
  if (alchemyMetadata) {
    const metadata = { ...alchemyMetadata, chain };
    metadataCache.set(cacheKey, metadata);
    return metadata;
  }

  // Final fallback
  const fallback: TokenMetadata = {
    symbol: `${addrLower.slice(0, 6)}...${addrLower.slice(-4)}`,
    decimals: 18,
    name: "Unknown Token",
    chain,
  };
  metadataCache.set(cacheKey, fallback);
  return fallback;
}

/**
 * Get token symbol from address (chain-sensitive)
 */
export async function getTokenSymbol(
  address: string | null | undefined,
  chain: string = "ethereum"
): Promise<string> {
  const metadata = await getTokenMetadata(address, chain);
  return metadata.symbol;
}

/**
 * Get token decimals from address (chain-sensitive)
 */
export async function getTokenDecimals(
  address: string | null | undefined,
  chain: string = "ethereum"
): Promise<number> {
  const metadata = await getTokenMetadata(address, chain);
  return metadata.decimals;
}

/**
 * Get token name from address (chain-sensitive)
 */
export async function getTokenName(
  address: string | null | undefined,
  chain: string = "ethereum"
): Promise<string> {
  const metadata = await getTokenMetadata(address, chain);
  return metadata.name;
}

/**
 * Synchronous version for backward compatibility (uses static map only)
 */
export function getTokenSymbolSync(address: string | null | undefined): string {
  if (!address) return "UNKNOWN";
  
  const addrLower = address.toLowerCase();
  const metadata = ETHEREUM_TOKENS[addrLower] || BASE_TOKENS[addrLower] || 
                   ARBITRUM_TOKENS[addrLower] || OPTIMISM_TOKENS[addrLower] || 
                   POLYGON_TOKENS[addrLower];
  
  if (metadata) {
    return metadata.symbol;
  }
  
  return `${addrLower.slice(0, 6)}...${addrLower.slice(-4)}`;
}

/**
 * Synchronous version for backward compatibility (uses static map only)
 */
export function getTokenDecimalsSync(address: string | null | undefined): number {
  if (!address) return 18;
  
  const addrLower = address.toLowerCase();
  const metadata = ETHEREUM_TOKENS[addrLower] || BASE_TOKENS[addrLower] || 
                   ARBITRUM_TOKENS[addrLower] || OPTIMISM_TOKENS[addrLower] || 
                   POLYGON_TOKENS[addrLower];
  
  return metadata?.decimals || 18;
}


