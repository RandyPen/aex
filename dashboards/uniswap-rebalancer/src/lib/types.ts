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
  token0Balance?: number;
  token1Balance?: number;
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
  oldTickLower: number;
  oldTickUpper: number;
  newTickLower: number;
  newTickUpper: number;
  triggerReason: "out_of_range_above" | "out_of_range_below" | "manual";
  gasCostEth: number;
  gasCostUsd: number;
  token0Recovered: number;
  token1Recovered: number;
  txHash?: string;
}

export interface PoolPosition {
  tokenId: string;
  pool: string;
  token0Symbol: string;
  token1Symbol: string;
  fee: number;
  tickLower: number;
  tickUpper: number;
  currentTick: number;
  inRange: boolean;
  liquidity: string;
  token0Amount: number;
  token1Amount: number;
  token0ValueUsd: number;
  token1ValueUsd: number;
  totalValueUsd: number;
  priceLower: number;
  priceUpper: number;
  currentPrice: number;
}

export interface FeeData {
  totalFeesToken0: number;
  totalFeesToken1: number;
  totalFeesUsd: number;
  fees24hToken0: number;
  fees24hToken1: number;
  fees24hUsd: number;
  feeApyEstimate: number;
  feesCollectedCount: number;
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

export interface DriftPoint {
  ts: string;
  currentTick: number;
  rangeCenterTick: number;
  driftBps: number;
  price: number;
}
