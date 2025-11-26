export async function getDexScreenerPrice(tokenAddress: string): Promise<number | null> {
  try {
    const res = await fetch(
      `https://api.dexscreener.com/latest/dex/tokens/${tokenAddress}`,
      { next: { revalidate: 30 } }
    );
    if (!res.ok) return null;
    const json = await res.json();
    if (!json || !json.pairs || json.pairs.length === 0) return null;
    // Choose first pair or best match
    const pair = json.pairs[0];
    if (!pair.priceUsd) return null;
    return parseFloat(pair.priceUsd);
  } catch (err) {
    console.error("DexScreener error:", err);
    return null;
  }
}

