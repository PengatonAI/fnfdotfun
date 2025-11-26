import { PricingProvider } from "./pricing-provider";
import { resolvePrice } from "./pricing";

export const pricingProvider: PricingProvider = {
  async getCurrentPrice(tokenAddress: string | null, chain: string): Promise<number | null> {
    return resolvePrice(tokenAddress, chain);
  },

  async getHistoricalPrice() {
    return null; // stub for now
  },
};

