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
  usdcBalance?: number;
}

export interface AgentEvent {
  ts: string;
  type: string;
  level: "info" | "event" | "error" | "warn";
  message: string;
  data?: Record<string, unknown>;
  txHash?: string;
}

export interface TradeEvent {
  ts: string;
  marketId: string;
  marketQuestion: string;
  side: "YES" | "NO";
  amount: number;
  price: number;
  status: "filled" | "pending" | "cancelled" | "partial";
  txHash?: string;
}

export interface PositionData {
  marketId: string;
  marketQuestion: string;
  side: "YES" | "NO";
  amount: number;
  avgPrice: number;
  currentPrice: number;
  pnl: number;
  pnlPct: number;
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

export interface MarketData {
  marketId: string;
  question: string;
  category: string;
  volume24h: number;
  liquidity: number;
  endDate: string;
  yesPrice: number;
  noPrice: number;
  watchReason: string;
}
