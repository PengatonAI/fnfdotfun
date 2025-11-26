"use client";

import Link from "next/link";
import { ExternalLink, Activity, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";

interface Trade {
  id: string;
  chain: string;
  timestamp: Date;
  direction: string;
  tokenOutSymbol: string | null;
  normalizedAmountOut: number | null;
  price: number | null;
  nativePrice: number | null;
  usdPricePerToken: number | null;
  usdValue: number | null;
  tokenInSymbol: string | null;
  walletAddress: string;
  txHash: string;
  raw: string | null;
}

interface RecentTradesTableProps {
  trades: Trade[];
}

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

  return format(date, "dd/MM/yyyy, HH:mm:ss");
};

const formatAddress = (addr: string) => {
  if (!addr) return "";
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
};

const formatUsdPrice = (value: number | null): string => {
  if (value == null || value === 0) {
    return "—";
  }

  if (value >= 1.0) {
    return `$${value.toFixed(4)}`;
  } else if (value >= 0.01) {
    return `$${value.toFixed(4)}`;
  } else {
    const trimmed = value.toFixed(8).replace(/\.?0+$/, "");
    return `$${trimmed}`;
  }
};

const getExplorerUrl = (txHash: string, chain: string) => {
  const chainLower = chain.toLowerCase();

  if (chainLower === "solana" || chainLower === "sol") {
    return `https://solscan.io/tx/${txHash}`;
  }

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

  return `https://etherscan.io/tx/${txHash}`;
};

export function RecentTradesTable({ trades }: RecentTradesTableProps) {
  // Take only the 5 most recent trades
  const recentTrades = trades.slice(0, 5);

  if (recentTrades.length === 0) {
    return (
      <div className="relative rounded-2xl overflow-hidden bg-gradient-to-br from-[#0d0d0d] via-[#111111] to-[#0a0a0a] border border-[#1a1a1a] shadow-[0_4px_20px_rgba(0,0,0,0.3)]">
        {/* Decorative glow */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-gradient-to-br from-accent/5 to-transparent rounded-full blur-3xl" />
        </div>

        <div className="relative p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2">
              <Activity className="w-5 h-5 text-accent" />
              <h2 className="text-lg font-semibold text-white">Recent Trades</h2>
            </div>
            <Link href="/profile/trades">
              <Button 
                variant="outline" 
                size="sm" 
                className="text-xs bg-transparent border-[#2a2a2a] text-white/60 hover:text-white hover:bg-white/5"
              >
                View All
                <ChevronRight className="w-3.5 h-3.5 ml-1" />
              </Button>
            </Link>
          </div>
          <div className="text-center py-8 rounded-xl bg-[#0a0a0a]/50 border border-[#1a1a1a]">
            <p className="text-white/30 text-sm">
              No trades yet. Your most recent trades will appear here.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative rounded-2xl overflow-hidden bg-gradient-to-br from-[#0d0d0d] via-[#111111] to-[#0a0a0a] border border-[#1a1a1a] shadow-[0_4px_20px_rgba(0,0,0,0.3)]">
      {/* Decorative glow */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-24 -right-24 w-64 h-64 bg-gradient-to-br from-accent/5 to-transparent rounded-full blur-3xl" />
      </div>

      <div className="relative">
        {/* Header */}
        <div className="flex items-center justify-between p-6 pb-4">
          <div className="flex items-center gap-2">
            <Activity className="w-5 h-5 text-accent" />
            <h2 className="text-lg font-semibold text-white">Recent Trades</h2>
          </div>
          <Link href="/profile/trades">
            <Button 
              variant="outline" 
              size="sm" 
              className="text-xs bg-transparent border-[#2a2a2a] text-white/60 hover:text-white hover:bg-white/5"
            >
              View All
              <ChevronRight className="w-3.5 h-3.5 ml-1" />
            </Button>
          </Link>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-t border-b border-[#1a1a1a] bg-[#0a0a0a]/50">
                <th className="text-left px-6 py-3 text-xs font-medium text-white/40 uppercase tracking-wider">
                  Timestamp
                </th>
                <th className="text-left px-6 py-3 text-xs font-medium text-white/40 uppercase tracking-wider">
                  Direction
                </th>
                <th className="text-left px-6 py-3 text-xs font-medium text-white/40 uppercase tracking-wider">
                  Token
                </th>
                <th className="text-left px-6 py-3 text-xs font-medium text-white/40 uppercase tracking-wider">
                  Amount
                </th>
                <th className="text-left px-6 py-3 text-xs font-medium text-white/40 uppercase tracking-wider">
                  Price
                </th>
                <th className="text-left px-6 py-3 text-xs font-medium text-white/40 uppercase tracking-wider">
                  Wallet
                </th>
                <th className="text-left px-6 py-3 text-xs font-medium text-white/40 uppercase tracking-wider">
                  Tx
                </th>
              </tr>
            </thead>
            <tbody>
              {recentTrades.map((trade) => {
                // Parse raw if it's a string
                let rawData: any = {};
                try {
                  rawData = typeof trade.raw === "string" ? JSON.parse(trade.raw) : trade.raw || {};
                } catch (e) {
                  rawData = {};
                }

                const displaySymbol = rawData.displayTokenSymbol || trade.tokenOutSymbol;
                const displayAmount = rawData.displayAmount ?? trade.normalizedAmountOut;

                // Use stored USD values from database
                let usdPrice: number | null = trade.usdPricePerToken;

                // Fallback calculation for old trades
                if (usdPrice == null && trade.price != null) {
                  const counterSymbol = trade.direction === "SELL" ? trade.tokenOutSymbol : trade.tokenInSymbol;
                  const counterSymbolUpper = counterSymbol?.toUpperCase() || "";
                  const stablecoinSymbols = ["USDC", "USDT", "DAI", "BUSD", "TUSD", "USDP", "FRAX", "LUSD"];
                  const isStablecoin = stablecoinSymbols.includes(counterSymbolUpper);
                  const nativeTokenSymbols = ["ETH", "WETH"];
                  const isNative = nativeTokenSymbols.includes(counterSymbolUpper);

                  let priceMultiplier: number | null = null;

                  if (isStablecoin) {
                    priceMultiplier = 1.0;
                  } else if (isNative && trade.nativePrice != null && trade.nativePrice > 0) {
                    priceMultiplier = trade.nativePrice;
                  }

                  if (priceMultiplier != null) {
                    usdPrice = trade.price * priceMultiplier;
                  }
                }

                return (
                  <tr key={trade.id} className="border-b border-[#1a1a1a] hover:bg-white/[0.02] transition-colors">
                    <td className="px-6 py-4 text-sm text-white/50 whitespace-nowrap">
                      {safeDate(trade.timestamp)}
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`px-2.5 py-1 rounded text-xs font-semibold uppercase ${
                          trade.direction === "BUY"
                            ? "bg-[#00d57a]/20 text-[#00d57a]"
                            : "bg-[#ff4a4a]/20 text-[#ff4a4a]"
                        }`}
                      >
                        {trade.direction}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm font-medium text-white">
                      {displaySymbol || "—"}
                    </td>
                    <td className="px-6 py-4 text-sm text-white/50">
                      {displayAmount != null ? (
                        <span>
                          {Number(displayAmount).toLocaleString(undefined, {
                            maximumFractionDigits: 2,
                          })}{" "}
                          {displaySymbol || ""}
                        </span>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td className="px-6 py-4 text-sm text-white/50">
                      {usdPrice != null && usdPrice > 0 ? formatUsdPrice(usdPrice) : "—"}
                    </td>
                    <td className="px-6 py-4 text-sm font-mono text-white/30">
                      {formatAddress(trade.walletAddress)}
                    </td>
                    <td className="px-6 py-4">
                      <a
                        href={getExplorerUrl(trade.txHash, trade.chain)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-white/30 hover:text-white transition-colors"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <ExternalLink className="h-4 w-4" />
                      </a>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
