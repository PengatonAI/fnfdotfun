"use client";

import { ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";

const safeDate = (value: any) => {
  if (!value) return "—";

  let date: Date;

  if (value instanceof Date) {
    date = value;
  } else if (typeof value === "string" && !isNaN(Date.parse(value))) {
    date = new Date(value);
  } else {
    return value.toString();
  }

  return format(date, "dd.MM.yyyy HH:mm:ss");
};

interface Trade {
  id: string;
  chain: string;
  timestamp: Date;
  direction: string;
  token: string | null;
  amount: number | null;
  price: number | null;
  nativePrice: number | null; // USD price of native token (ETH, SOL) at trade time
  usdPricePerToken: number | null; // Stored USD price per token (calculated at sync time)
  usdValue: number | null; // Stored total USD value (calculated at sync time)
  tokenInSymbol: string | null; // For determining counter token symbol
  tokenOutSymbol: string | null; // For determining counter token symbol
  walletAddress: string;
  txHash: string;
  raw: string | null; // Raw JSON field containing display fields
  wallet: {
    address: string;
    chain: string;
    label: string | null;
  };
}

interface TradesTableProps {
  trades: Trade[];
}

export default function TradesTable({ trades }: TradesTableProps) {
  const formatAddress = (addr: string) => {
    if (!addr) return "";
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
  };

  /**
   * Format USD value with conditional decimal places based on magnitude
   * - > $1.00: 2 decimal places (e.g., "$1,250.00")
   * - $0.01 to $1.00: 4 decimal places (e.g., "$0.1942")
   * - < $0.01: up to 8 decimal places, removing trailing zeros (e.g., "$0.00000421")
   * - 0 or null: returns "—"
   */
  const formatUsdPrice = (value: number | null): string => {
    if (value == null || value === 0) {
      return "—";
    }

    if (value >= 1.0) {
      return `$${value.toFixed(2)}`;
    } else if (value >= 0.01) {
      return `$${value.toFixed(4)}`;
    } else {
      const trimmed = value.toFixed(8).replace(/\.?0+$/, "");
      return `$${trimmed}`;
    }
  };

  const getExplorerUrl = (txHash: string, chain: string) => {
    // Normalize chain name to lowercase for comparison
    const chainLower = chain.toLowerCase();
    
    if (chainLower === "solana" || chainLower === "sol") {
      return `https://solscan.io/tx/${txHash}`;
    }
    
    // Ethereum and EVM chains
    if (chainLower === "ethereum" || chainLower === "eth" || chainLower === "mainnet") {
      return `https://etherscan.io/tx/${txHash}`;
    }
    
    if (chainLower === "base") {
      return `https://basescan.org/tx/${txHash}`;
    }
    
    if (chainLower === "arbitrum" || chainLower === "arbitrum-one") {
      return `https://arbiscan.io/tx/${txHash}`;
    }
    
    if (chainLower === "optimism" || chainLower === "op") {
      return `https://optimistic.etherscan.io/tx/${txHash}`;
    }
    
    if (chainLower === "polygon" || chainLower === "matic") {
      return `https://polygonscan.com/tx/${txHash}`;
    }
    
    if (chainLower === "avalanche" || chainLower === "avax") {
      return `https://snowtrace.io/tx/${txHash}`;
    }
    
    if (chainLower === "bsc" || chainLower === "binance") {
      return `https://bscscan.com/tx/${txHash}`;
    }
    
    // Default to Etherscan for unknown EVM chains
    return `https://etherscan.io/tx/${txHash}`;
  };

  if (trades.length === 0) {
    return (
      <div className="rounded-lg border p-8 text-center">
        <p className="text-muted-foreground">
          No trades yet. Click &quot;Sync Data&quot; to fetch your trading history.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-lg border bg-card overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b bg-muted/50">
              <th className="text-left p-3 text-sm font-medium">Timestamp</th>
              <th className="text-left p-3 text-sm font-medium">Direction</th>
              <th className="text-left p-3 text-sm font-medium">Token</th>
              <th className="text-right p-3 text-sm font-medium">Amount</th>
              <th className="text-right p-3 text-sm font-medium">Price</th>
              <th className="text-left p-3 text-sm font-medium">Wallet</th>
              <th className="text-left p-3 text-sm font-medium">Tx</th>
            </tr>
          </thead>
          <tbody>
            {trades.map((trade) => {
              // Parse raw if it's a string, or use it directly if it's an object
              let rawData: any = {};
              try {
                rawData = typeof trade.raw === 'string' ? JSON.parse(trade.raw) : trade.raw || {};
              } catch (e) {
                // If parsing fails, use empty object
                rawData = {};
              }

              // Use display fields from raw if available, otherwise fall back to trade fields
              // This ensures SELL trades show the sold token (MSIA) not the received token (ETH)
              const displaySymbol = rawData.displayTokenSymbol || trade.token;
              const displayAmount = rawData.displayAmount ?? trade.amount;

              // Use stored USD values from database (calculated at sync time)
              // Fallback to calculation for old trades that haven't been re-synced
              let usdPrice: number | null = trade.usdPricePerToken;
              let totalUsdValue: number | null = trade.usdValue;
              
              // Fallback: Calculate USD values if not stored (for old trades)
              if (usdPrice == null && trade.price != null) {
                // Determine counter token symbol based on direction
                // For SELL: display = tokenIn, counter = tokenOut
                // For BUY: display = tokenOut, counter = tokenIn
                const counterSymbol = trade.direction === "SELL" 
                  ? trade.tokenOutSymbol 
                  : trade.tokenInSymbol;
                
                // Get nativePrice from trade object
                const nativePrice = trade.nativePrice;
                
                // List of stablecoin symbols (case-insensitive check)
                const stablecoinSymbols = ["USDC", "USDT", "DAI", "BUSD", "TUSD", "USDP", "FRAX", "LUSD"];
                const counterSymbolUpper = counterSymbol?.toUpperCase() || "";
                const isStablecoin = stablecoinSymbols.includes(counterSymbolUpper);
                
                // Define native tokens (ETH and WETH are both treated as native)
                // WETH is wrapped ETH, so it should use the same price as ETH
                const nativeTokenSymbols = ["ETH", "WETH"];
                const isNative = nativeTokenSymbols.includes(counterSymbolUpper);
                
                // Determine price multiplier based on counter token type
                let priceMultiplier: number | null = null;
                
                if (isStablecoin) {
                  // For stablecoin trades, use ~1.0 as the multiplier
                  priceMultiplier = 1.0;
                } else if (isNative && nativePrice != null && nativePrice > 0) {
                  // For native token trades (ETH, WETH), use nativePrice
                  // Note: nativePrice tracks ETH USD price, which applies to both ETH and WETH
                  priceMultiplier = nativePrice;
                } else {
                  // If nativePrice is missing and it's not a stablecoin or native token, we can't calculate USD
                  priceMultiplier = null;
                }
                
                // Calculate USD price per display token
                if (priceMultiplier != null) {
                  usdPrice = trade.price * priceMultiplier;
                  
                  // Calculate total USD value of the trade
                  // totalUsdValue = displayAmount * usdPrice
                  if (displayAmount != null && usdPrice != null && usdPrice > 0) {
                    totalUsdValue = displayAmount * usdPrice;
                  }
                }
              }
              
              // Determine counter token symbol for display (needed for showing raw price)
              const counterSymbol = trade.direction === "SELL" 
                ? trade.tokenOutSymbol 
                : trade.tokenInSymbol;

              return (
                <tr key={trade.id} className="border-b hover:bg-muted/30">
                  <td className="p-3 text-sm">
                    {safeDate(trade.timestamp)}
                  </td>
                  <td className="text-left p-3">
                    <span
                      className={`px-2 py-1 rounded text-xs font-medium ${
                        trade.direction === "BUY"
                          ? "bg-[#00d57a]/20 text-[#00d57a]"
                          : "bg-[#ff4a4a]/20 text-[#ff4a4a]"
                      }`}
                    >
                      {trade.direction}
                    </span>
                  </td>
                  <td className="text-left p-3">
                    {displaySymbol || "—"}
                  </td>
                  <td className="text-right p-3">
                    <div className="flex flex-col items-end">
                      {displayAmount != null ? (
                        <>
                          <span>
                            {Number(displayAmount).toString()} {displaySymbol || ""}
                          </span>
                          {totalUsdValue != null && totalUsdValue > 0 && (
                            <span className="text-xs text-muted-foreground">
                              ~{formatUsdPrice(totalUsdValue)}
                            </span>
                          )}
                        </>
                      ) : (
                        "—"
                      )}
                    </div>
                  </td>
                  <td className="text-right p-3">
                    {trade.price != null ? (
                      <div className="flex flex-col items-end">
                        {usdPrice != null && usdPrice > 0 ? (
                          <>
                            <span className="font-medium">
                              {formatUsdPrice(usdPrice)}
                            </span>
                            <span className="text-xs text-muted-foreground">
                              {trade.price.toFixed(6)} {counterSymbol || ""}
                            </span>
                          </>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </div>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td className="p-3 text-sm">
                    <span className="font-mono text-xs">
                      {formatAddress(trade.wallet.address)}
                    </span>
                    {trade.wallet.label && (
                      <span className="text-xs text-muted-foreground ml-1">
                        ({trade.wallet.label})
                      </span>
                    )}
                  </td>
                  <td className="p-3">
                    <Button
                      variant="ghost"
                      size="sm"
                      asChild
                      className="h-8 w-8 p-0"
                    >
                      <a
                        href={getExplorerUrl(trade.txHash, trade.chain)}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <ExternalLink className="h-4 w-4" />
                      </a>
                    </Button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <div className="p-4 border-t text-sm text-muted-foreground">
        Showing {trades.length} trade{trades.length !== 1 ? "s" : ""}
      </div>
    </div>
  );
}

