export interface TokenPosition {
  tokenSymbol: string | null;
  tokenAddress: string | null;
  chain: string;
  quantity: number;
  avgCostBasis: number;
  totalCostBasis: number;
  currentValue?: number;
  unrealizedPnL?: number;
  realizedPnL: number;
}

export interface ProcessedTrade {
  tradeId: string;
  timestamp: Date;
  tokenInAddress: string | null;
  tokenOutAddress: string | null;
  chain: string;
  direction: "BUY" | "SELL";
  amount: number | null;
  usdValue: number | null;
  realizedPnL?: number;
  costBasisUsed?: number;
}

export interface PnLResult {
  positions: TokenPosition[];
  realizedPnL: number;
  unrealizedPnL: number;
  totalPnL: number;
  metrics: {
    totalTrades: number;
    profitableTrades: number;
    losingTrades: number;
    winRate: number;
    volume: number;
    avgWin: number;
    avgLoss: number;
  };
  tradeHistory: ProcessedTrade[];
}

