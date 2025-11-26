export async function getCryptoComparePrice(symbol: string): Promise<number | null> {
  try {
    const res = await fetch(
      `https://min-api.cryptocompare.com/data/price?fsym=${symbol.toUpperCase()}&tsyms=USD`,
      { next: { revalidate: 30 } }
    );
    if (!res.ok) return null;
    const json = await res.json();
    if (!json || !json.USD) return null;
    return json.USD;
  } catch (err) {
    console.error("CryptoCompare error:", err);
    return null;
  }
}

