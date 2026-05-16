import { getPool } from "./db";
import type {
  BalanceSnapshot,
  AgentEvent,
  RebalanceEvent,
  AllocationState,
  ThresholdState,
  PricePoint,
  PnLData,
} from "./types";

interface EventRow {
  ts: string;
  level: string;
  message: string;
  data: Record<string, unknown>;
}

async function fetchEvents(agentId: string, limit = 5000): Promise<EventRow[]> {
  const pool = getPool();
  if (!pool) return [];
  const r = await pool.query(
    `SELECT ts, level, message, data
       FROM agent_events
      WHERE agent_id = $1
   ORDER BY ts DESC
      LIMIT $2`,
    [agentId, limit],
  );
  return r.rows.map((row) => ({
    ts: row.ts.toISOString ? row.ts.toISOString() : String(row.ts),
    level: row.level,
    message: row.message,
    data: row.data || {},
  }));
}

export async function getBalanceHistoryFromDb(agentId: string): Promise<BalanceSnapshot[]> {
  const pool = getPool();
  if (!pool) return [];
  const r = await pool.query(
    `SELECT ts, balance, data
       FROM agent_balance_snapshots
      WHERE agent_id = $1
   ORDER BY ts ASC
      LIMIT 1000`,
    [agentId],
  );
  return r.rows.map((row) => {
    const d = row.data as Record<string, unknown> | null;
    return {
      ts: row.ts.toISOString ? row.ts.toISOString() : String(row.ts),
      balance: Number(row.balance),
      targetTokenBalance: d && typeof d.targetTokenBalance === "number" ? d.targetTokenBalance : undefined,
      stableBalance: d && typeof d.stableBalance === "number" ? d.stableBalance : undefined,
    };
  });
}

export async function getAgentEventsFromDb(agentId: string): Promise<AgentEvent[]> {
  const events = await fetchEvents(agentId, 100);
  return events.map((e) => ({
    ts: e.ts,
    type: e.message,
    level: e.level as AgentEvent["level"],
    message: e.message,
    data: e.data,
    txHash: typeof e.data.txHash === "string" ? (e.data.txHash as string) : undefined,
  }));
}

export async function getRebalanceHistoryFromDb(agentId: string): Promise<RebalanceEvent[]> {
  const pool = getPool();
  if (!pool) return [];
  const r = await pool.query(
    `SELECT ts, data
       FROM agent_events
      WHERE agent_id = $1 AND message = 'rebalance_complete'
   ORDER BY ts DESC
      LIMIT 50`,
    [agentId],
  );
  return r.rows.map((row) => {
    const d = row.data as Record<string, unknown>;
    return {
      ts: row.ts.toISOString ? row.ts.toISOString() : String(row.ts),
      direction: (d.direction as "BUY" | "SELL") ?? "BUY",
      triggerPrice: Number(d.triggerPrice ?? 0),
      amountSwapped: Number(d.amountSwapped ?? 0),
      amountSwappedSymbol: String(d.amountSwappedSymbol ?? ""),
      usdValue: Number(d.usdValue ?? 0),
      gasCost: Number(d.gasCost ?? 0),
      gasCostNative: Number(d.gasCostNative ?? 0),
      gasCostSymbol: String(d.gasCostSymbol ?? "ETH"),
      txHash: typeof d.txHash === "string" ? d.txHash : undefined,
    };
  });
}

export async function getAllocationStateFromDb(agentId: string): Promise<AllocationState | null> {
  const pool = getPool();
  if (!pool) return null;
  const r = await pool.query(
    `SELECT ts, data
       FROM agent_events
      WHERE agent_id = $1 AND message = 'allocation_snapshot'
   ORDER BY ts DESC
      LIMIT 1`,
    [agentId],
  );
  if (!r.rows.length) return null;
  const d = r.rows[0].data as Record<string, unknown>;
  return {
    targetToken: String(d.targetToken ?? "ETH"),
    stableToken: String(d.stableToken ?? "USDC"),
    currentPrice: Number(d.currentPrice ?? 0),
    targetTokenBalance: Number(d.targetTokenBalance ?? 0),
    stableBalance: Number(d.stableBalance ?? 0),
    targetTokenValueUsd: Number(d.targetTokenValueUsd ?? 0),
    stableValueUsd: Number(d.stableValueUsd ?? 0),
    totalValueUsd: Number(d.totalValueUsd ?? 0),
    targetAllocationPct: Number(d.targetAllocationPct ?? 50),
    currentAllocationPct: Number(d.currentAllocationPct ?? 50),
    deviationPct: Number(d.deviationPct ?? 0),
  };
}

export async function getThresholdStateFromDb(agentId: string): Promise<ThresholdState | null> {
  const pool = getPool();
  if (!pool) return null;
  const r = await pool.query(
    `SELECT ts, data
       FROM agent_events
      WHERE agent_id = $1 AND message = 'threshold_snapshot'
   ORDER BY ts DESC
      LIMIT 1`,
    [agentId],
  );
  if (!r.rows.length) return null;
  const d = r.rows[0].data as Record<string, unknown>;
  return {
    currentPrice: Number(d.currentPrice ?? 0),
    highThreshold: Number(d.highThreshold ?? 0),
    lowThreshold: Number(d.lowThreshold ?? 0),
    zone: (d.zone as ThresholdState["zone"]) ?? "hold",
    targetToken: String(d.targetToken ?? "ETH"),
    stableToken: String(d.stableToken ?? "USDC"),
  };
}

export async function getPriceHistoryFromDb(agentId: string): Promise<PricePoint[]> {
  const pool = getPool();
  if (!pool) return [];
  const r = await pool.query(
    `SELECT ts, data
       FROM agent_events
      WHERE agent_id = $1 AND message = 'price_check'
   ORDER BY ts ASC
      LIMIT 1000`,
    [agentId],
  );
  return r.rows.map((row) => {
    const d = row.data as Record<string, unknown>;
    return {
      ts: row.ts.toISOString ? row.ts.toISOString() : String(row.ts),
      price: Number(d.price ?? 0),
    };
  });
}

export async function getPnLFromDb(agentId: string): Promise<PnLData> {
  const balances = await getBalanceHistoryFromDb(agentId);
  const initial = balances[0]?.balance ?? 0;
  const current = balances[balances.length - 1]?.balance ?? 0;
  const totalPnl = current - initial;
  const totalPnlPct = initial > 0 ? (totalPnl / initial) * 100 : 0;

  const pool = getPool();
  let totalTrades = 0;
  let wins = 0;
  let losses = 0;
  let totalVolume = 0;
  let bestTrade = 0;
  let worstTrade = 0;

  if (pool) {
    const trades = await pool.query(
      `SELECT data FROM agent_events
        WHERE agent_id = $1 AND message = 'rebalance_complete'
     ORDER BY ts DESC`,
      [agentId],
    );
    totalTrades = trades.rows.length;
    for (const row of trades.rows) {
      const d = row.data as Record<string, unknown>;
      const pnl = Number(d.pnl ?? 0);
      const amount = Number(d.usdValue ?? 0);
      totalVolume += amount;
      if (pnl > 0) wins++;
      if (pnl < 0) losses++;
      if (pnl > bestTrade) bestTrade = pnl;
      if (pnl < worstTrade) worstTrade = pnl;
    }
  }

  const winRate = totalTrades > 0 ? (wins / totalTrades) * 100 : 0;
  const avgTradeSize = totalTrades > 0 ? totalVolume / totalTrades : 0;

  return {
    totalPnl,
    totalPnlPct,
    winRate,
    totalTrades,
    totalVolume,
    wins,
    losses,
    bestTrade,
    worstTrade,
    avgTradeSize,
  };
}

export async function getAgentStatusFromDb(agentId: string): Promise<{ status: "running" | "stopped" | "error"; uptime: string; lastActivity: string }> {
  const pool = getPool();
  if (!pool) return { status: "stopped", uptime: "--", lastActivity: "--" };
  const r = await pool.query(
    `SELECT ts FROM agent_events WHERE agent_id = $1 ORDER BY ts DESC LIMIT 1`,
    [agentId],
  );
  if (!r.rows.length) return { status: "stopped", uptime: "no events", lastActivity: "never" };
  const lastTs = new Date(r.rows[0].ts);
  const now = new Date();
  const ageMs = now.getTime() - lastTs.getTime();
  const isRunning = ageMs < 35 * 60 * 1000;
  const lastActivity = formatRelative(ageMs);
  return {
    status: isRunning ? "running" : "stopped",
    uptime: isRunning ? "active" : "stale",
    lastActivity,
  };
}

export async function getAgentMetadata(agentId: string) {
  const pool = getPool();
  if (!pool) return null;
  const r = await pool.query(`SELECT id, name, description, chain, protocol, category, wallet_address, started_at, metadata FROM agents WHERE id = $1`, [agentId]);
  return r.rows[0] ?? null;
}

function formatRelative(ms: number): string {
  if (ms < 60_000) return `${Math.round(ms / 1000)}s ago`;
  if (ms < 3600_000) return `${Math.round(ms / 60_000)}m ago`;
  if (ms < 86400_000) return `${Math.round(ms / 3600_000)}h ago`;
  return `${Math.round(ms / 86400_000)}d ago`;
}
