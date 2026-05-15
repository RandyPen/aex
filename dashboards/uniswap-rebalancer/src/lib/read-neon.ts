import { getPool } from "./db";
import type {
  BalanceSnapshot,
  AgentEvent,
  RebalanceEvent,
  PoolPosition,
  FeeData,
  PnLData,
  DriftPoint,
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
      token0Balance: d && typeof d.token0Balance === "number" ? d.token0Balance : undefined,
      token1Balance: d && typeof d.token1Balance === "number" ? d.token1Balance : undefined,
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
      WHERE agent_id = $1 AND message IN ('rebalance_complete', 'rebalance_drained_no_remint')
   ORDER BY ts DESC
      LIMIT 50`,
    [agentId],
  );
  return r.rows.map((row) => {
    const d = row.data as Record<string, unknown>;
    return {
      ts: row.ts.toISOString ? row.ts.toISOString() : String(row.ts),
      oldTickLower: Number(d.oldTickLower ?? 0),
      oldTickUpper: Number(d.oldTickUpper ?? 0),
      newTickLower: Number(d.newTickLower ?? 0),
      newTickUpper: Number(d.newTickUpper ?? 0),
      triggerReason: (d.triggerReason as RebalanceEvent["triggerReason"]) ?? "out_of_range_above",
      gasCostEth: Number(d.gasCostEth ?? 0),
      gasCostUsd: Number(d.gasCostUsd ?? 0),
      token0Recovered: Number(d.token0Recovered ?? 0),
      token1Recovered: Number(d.token1Recovered ?? 0),
      txHash: typeof d.txHash === "string" ? d.txHash : undefined,
    };
  });
}

export async function getPoolPositionFromDb(agentId: string): Promise<PoolPosition | null> {
  const pool = getPool();
  if (!pool) return null;
  const r = await pool.query(
    `SELECT ts, data
       FROM agent_events
      WHERE agent_id = $1 AND message = 'position_snapshot'
   ORDER BY ts DESC
      LIMIT 1`,
    [agentId],
  );
  if (!r.rows.length) return null;
  const d = r.rows[0].data as Record<string, unknown>;
  return {
    tokenId: String(d.tokenId ?? ""),
    pool: String(d.pool ?? ""),
    token0Symbol: String(d.token0Symbol ?? "ETH"),
    token1Symbol: String(d.token1Symbol ?? "USDC"),
    fee: Number(d.fee ?? 500),
    tickLower: Number(d.tickLower ?? 0),
    tickUpper: Number(d.tickUpper ?? 0),
    currentTick: Number(d.currentTick ?? 0),
    inRange: Boolean(d.inRange),
    liquidity: String(d.liquidity ?? "0"),
    token0Amount: Number(d.token0Amount ?? 0),
    token1Amount: Number(d.token1Amount ?? 0),
    token0ValueUsd: Number(d.token0ValueUsd ?? 0),
    token1ValueUsd: Number(d.token1ValueUsd ?? 0),
    totalValueUsd: Number(d.totalValueUsd ?? 0),
    priceLower: Number(d.priceLower ?? 0),
    priceUpper: Number(d.priceUpper ?? 0),
    currentPrice: Number(d.currentPrice ?? 0),
  };
}

export async function getFeeDataFromDb(agentId: string): Promise<FeeData> {
  const pool = getPool();
  if (!pool) {
    return {
      totalFeesToken0: 0, totalFeesToken1: 0, totalFeesUsd: 0,
      fees24hToken0: 0, fees24hToken1: 0, fees24hUsd: 0,
      feeApyEstimate: 0, feesCollectedCount: 0,
    };
  }
  const r = await pool.query(
    `SELECT ts, data
       FROM agent_events
      WHERE agent_id = $1 AND message = 'fee_snapshot'
   ORDER BY ts DESC
      LIMIT 1`,
    [agentId],
  );
  if (!r.rows.length) {
    return {
      totalFeesToken0: 0, totalFeesToken1: 0, totalFeesUsd: 0,
      fees24hToken0: 0, fees24hToken1: 0, fees24hUsd: 0,
      feeApyEstimate: 0, feesCollectedCount: 0,
    };
  }
  const d = r.rows[0].data as Record<string, unknown>;
  return {
    totalFeesToken0: Number(d.totalFeesToken0 ?? 0),
    totalFeesToken1: Number(d.totalFeesToken1 ?? 0),
    totalFeesUsd: Number(d.totalFeesUsd ?? 0),
    fees24hToken0: Number(d.fees24hToken0 ?? 0),
    fees24hToken1: Number(d.fees24hToken1 ?? 0),
    fees24hUsd: Number(d.fees24hUsd ?? 0),
    feeApyEstimate: Number(d.feeApyEstimate ?? 0),
    feesCollectedCount: Number(d.feesCollectedCount ?? 0),
  };
}

export async function getDriftHistoryFromDb(agentId: string): Promise<DriftPoint[]> {
  const pool = getPool();
  if (!pool) return [];
  const r = await pool.query(
    `SELECT ts, data
       FROM agent_events
      WHERE agent_id = $1 AND message = 'range_check'
   ORDER BY ts ASC
      LIMIT 1000`,
    [agentId],
  );
  return r.rows.map((row) => {
    const d = row.data as Record<string, unknown>;
    return {
      ts: row.ts.toISOString ? row.ts.toISOString() : String(row.ts),
      currentTick: Number(d.currentTick ?? 0),
      rangeCenterTick: Number(d.rangeCenterTick ?? 0),
      driftBps: Number(d.driftBps ?? 0),
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
        WHERE agent_id = $1 AND message IN ('rebalance_complete', 'fee_collection')
     ORDER BY ts DESC`,
      [agentId],
    );
    totalTrades = trades.rows.length;
    for (const row of trades.rows) {
      const d = row.data as Record<string, unknown>;
      const pnl = Number(d.pnl ?? 0);
      const amount = Number(d.totalValueUsd ?? 0);
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
