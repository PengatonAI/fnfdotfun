export async function getCoinGeckoPrice(
  tokenAddress: string,
  chain: string
): Promise<number | null> {
  try {
    const platform = chain === "ethereum"
      ? "ethereum"
      : chain === "solana"
      ? "solana"
      : null;
    if (!platform) return null;
    const res = await fetch(
      `https://api.coingecko.com/api/v3/simple/token_price/${platform}?contract_addresses=${tokenAddress}&vs_currencies=usd`,
      { next: { revalidate: 30 } }
    );
    if (!res.ok) return null;
    const json = await res.json();
    const addressKey = Object.keys(json)[0];
    if (!addressKey) return null;
    const price = json[addressKey]?.usd;
    if (!price) return null;
    return price;
  } catch (err) {
    console.error("CoinGecko error:", err);
    return null;
  }
}

