export interface Agent {
  id: string;
  name: string;
  description: string;
  email: string;
  chain: string;
  network: string;
  protocol: string;
  walletAddress: string;
  status: "running" | "stopped" | "error";
  uptime: string;
  lastActivity: string;
  config: Record<string, string>;
  tools: string[];
}

export interface BalanceSnapshot {
  ts: string;
  balance: number;
  targetTokenBalance?: number;
  stableBalance?: number;
}

export interface AgentEvent {
  ts: string;
  type: string;
  level: "info" | "event" | "error" | "warn";
  message: string;
  data?: Record<string, unknown>;
  txHash?: string;
}

export interface RebalanceEvent {
  ts: string;
  direction: "BUY" | "SELL";
  triggerPrice: number;
  amountSwapped: number;
  amountSwappedSymbol: string;
  usdValue: number;
  gasCost: number;
  gasCostNative: number;
  gasCostSymbol: string;
  txHash?: string;
}

export interface AllocationState {
  targetToken: string;
  stableToken: string;
  currentPrice: number;
  targetTokenBalance: number;
  stableBalance: number;
  targetTokenValueUsd: number;
  stableValueUsd: number;
  totalValueUsd: number;
  targetAllocationPct: number;
  currentAllocationPct: number;
  deviationPct: number;
}

export interface ThresholdState {
  currentPrice: number;
  highThreshold: number;
  lowThreshold: number;
  zone: "hold" | "sell_zone" | "buy_zone";
  targetToken: string;
  stableToken: string;
}

export interface PricePoint {
  ts: string;
  price: number;
}

export interface PnLData {
  totalPnl: number;
  totalPnlPct: number;
  winRate: number;
  totalTrades: number;
  totalVolume: number;
  wins: number;
  losses: number;
  bestTrade: number;
  worstTrade: number;
  avgTradeSize: number;
}
