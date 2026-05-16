/* ── Shared types (kept from base dashboard) ── */

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

/* ── Arbitrage-specific types ── */

export type ArbStrategy = "complementary" | "related";
export type ArbStatus = "detected" | "executing" | "complete" | "failed";
export type LegStatus = "pending" | "placed" | "partial" | "filled" | "failed" | "cancelled";

export interface ArbLeg {
  orderId: string;
  side: "YES" | "NO";
  amount: number;
  status: LegStatus;
  fillPrice: number | null;
  filledAt: string | null;
}

export interface ArbOpportunity {
  id: string;
  marketA: string;
  marketAQuestion: string;
  marketB: string;
  marketBQuestion: string;
  strategy: ArbStrategy;
  spreadBps: number;
  expectedProfit: number;
  actualProfit: number | null;
  status: ArbStatus;
  detectedAt: string;
  executedAt: string | null;
  completedAt: string | null;
  legA: ArbLeg;
  legB: ArbLeg;
}

export interface OpenArbPosition {
  id: string;
  marketA: string;
  marketAQuestion: string;
  marketB: string;
  marketBQuestion: string;
  legAStatus: LegStatus;
  legBStatus: LegStatus;
  entrySpreadBps: number;
  currentSpreadBps: number;
  unrealizedPnl: number;
  openedAt: string;
}

export interface SpreadDataPoint {
  ts: string;
  pair: string;
  spreadBps: number;
}
