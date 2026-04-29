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

export interface PositionData {
  tickLower: number;
  tickUpper: number;
  currentTick: number;
  drift: number;
  threshold: number;
  rangeWidth: number;
  inRange: boolean;
  timeInRangePct: number;
  positionOpenedAt: string | null;
  rebalanceCount: number;
  liquidity: string;
}

export interface PerformanceData {
  initialBalance: number;
  currentBalance: number;
  pnl: number;
  pnlPct: number;
  totalGasSpent: number;
  rebalanceCount: number;
  uptimeHours: number;
  estimatedApy: number;
}

export interface VolatilityData {
  volatility: number;
  volatilitySamples: number;
  adaptiveRange: number;
  baseRange: number;
  recommendation: string;
}

export interface PoolYield {
  symbol: string;
  apy: number;
  tvl: number;
  pool?: string;
}

export interface CrossProtocolYield {
  protocol: string;
  type: "lending" | "lp";
  asset: string;
  apy: number;
  tvl: number;
}

export interface YieldScanData {
  cetusTopPools: PoolYield[];
  crossProtocol: CrossProtocolYield[];
  currentPool: {
    symbol: string;
    protocol: string;
    apy: number | null;
    tvl: number | null;
    rank: number | null;
  };
  bestAlternative: CrossProtocolYield | null;
  scanTime: string;
}
