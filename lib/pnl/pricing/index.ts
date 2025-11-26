import { getDexScreenerPrice } from "./dexscreener";
import { getCoinGeckoPrice } from "./coingecko";
import { getCryptoComparePrice } from "./crypto-compare";

export async function resolvePrice(
  tokenAddress: string | null,
  chain: string
): Promise<number | null> {
  if (!tokenAddress) return null;

  // 1. Try DexScreener
  const ds = await getDexScreenerPrice(tokenAddress);
  if (ds) return ds;

  // 2. Try CoinGecko
  const cg = await getCoinGeckoPrice(tokenAddress, chain);
  if (cg) return cg;

  // 3. Fallback to CryptoCompare (native assets only)
  if (chain === "solana" && tokenAddress === "So11111111111111111111111111111111111111112") {
    return await getCryptoComparePrice("SOL");
  }
  if (chain === "ethereum" && tokenAddress.toLowerCase() === "0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee") {
    return await getCryptoComparePrice("ETH");
  }

  return null;
}

