import { getPool } from "./db";
import type {
  BalanceSnapshot,
  AgentEvent,
  PnLData,
  ArbOpportunity,
  ArbLeg,
  OpenArbPosition,
  SpreadDataPoint,
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
    `SELECT ts, balance, usdc_balance
       FROM agent_balance_snapshots
      WHERE agent_id = $1
   ORDER BY ts ASC
      LIMIT 1000`,
    [agentId],
  );
  return r.rows.map((row) => ({
    ts: row.ts.toISOString ? row.ts.toISOString() : String(row.ts),
    balance: Number(row.balance),
    usdcBalance: row.usdc_balance != null ? Number(row.usdc_balance) : undefined,
  }));
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

function parseLeg(d: Record<string, unknown>, prefix: string): ArbLeg {
  return {
    orderId: String(d[`${prefix}OrderId`] ?? ""),
    side: (d[`${prefix}Side`] === "NO" ? "NO" : "YES") as "YES" | "NO",
    amount: Number(d[`${prefix}Amount`] ?? 0),
    status: String(d[`${prefix}Status`] ?? "pending") as ArbLeg["status"],
    fillPrice: d[`${prefix}FillPrice`] != null ? Number(d[`${prefix}FillPrice`]) : null,
    filledAt: d[`${prefix}FilledAt`] ? String(d[`${prefix}FilledAt`]) : null,
  };
}

export async function getArbOpportunitiesFromDb(agentId: string): Promise<ArbOpportunity[]> {
  const pool = getPool();
  if (!pool) return [];
  const r = await pool.query(
    `SELECT ts, data
       FROM agent_events
      WHERE agent_id = $1 AND message IN ('arb_detected', 'arb_executing', 'arb_complete', 'arb_failed')
   ORDER BY ts DESC
      LIMIT 200`,
    [agentId],
  );
  return r.rows.map((row) => {
    const d = row.data as Record<string, unknown>;
    return {
      id: String(d.id ?? ""),
      marketA: String(d.marketA ?? ""),
      marketAQuestion: String(d.marketAQuestion ?? ""),
      marketB: String(d.marketB ?? ""),
      marketBQuestion: String(d.marketBQuestion ?? ""),
      strategy: (d.strategy === "complementary" ? "complementary" : "related") as ArbOpportunity["strategy"],
      spreadBps: Number(d.spreadBps ?? 0),
      expectedProfit: Number(d.expectedProfit ?? 0),
      actualProfit: d.actualProfit != null ? Number(d.actualProfit) : null,
      status: String(d.status ?? "detected") as ArbOpportunity["status"],
      detectedAt: String(d.detectedAt ?? row.ts),
      executedAt: d.executedAt ? String(d.executedAt) : null,
      completedAt: d.completedAt ? String(d.completedAt) : null,
      legA: parseLeg(d, "legA"),
      legB: parseLeg(d, "legB"),
    };
  });
}

export async function getOpenPositionsFromDb(agentId: string): Promise<OpenArbPosition[]> {
  const pool = getPool();
  if (!pool) return [];
  const r = await pool.query(
    `SELECT ts, data
       FROM agent_events
      WHERE agent_id = $1 AND message = 'arb_position_snapshot'
   ORDER BY ts DESC
      LIMIT 1`,
    [agentId],
  );
  if (!r.rows.length) return [];
  const d = r.rows[0].data as Record<string, unknown>;
  const positions = (d.positions as unknown[]) ?? [];
  return (positions as Record<string, unknown>[]).map((p) => ({
    id: String(p.id ?? ""),
    marketA: String(p.marketA ?? ""),
    marketAQuestion: String(p.marketAQuestion ?? ""),
    marketB: String(p.marketB ?? ""),
    marketBQuestion: String(p.marketBQuestion ?? ""),
    legAStatus: String(p.legAStatus ?? "pending") as OpenArbPosition["legAStatus"],
    legBStatus: String(p.legBStatus ?? "pending") as OpenArbPosition["legBStatus"],
    entrySpreadBps: Number(p.entrySpreadBps ?? 0),
    currentSpreadBps: Number(p.currentSpreadBps ?? 0),
    unrealizedPnl: Number(p.unrealizedPnl ?? 0),
    openedAt: String(p.openedAt ?? ""),
  }));
}

export async function getSpreadHistoryFromDb(agentId: string): Promise<SpreadDataPoint[]> {
  const pool = getPool();
  if (!pool) return [];
  const r = await pool.query(
    `SELECT ts, data
       FROM agent_events
      WHERE agent_id = $1 AND message = 'spread_snapshot'
   ORDER BY ts ASC
      LIMIT 2000`,
    [agentId],
  );
  return r.rows.map((row) => {
    const d = row.data as Record<string, unknown>;
    return {
      ts: row.ts.toISOString ? row.ts.toISOString() : String(row.ts),
      pair: String(d.pair ?? ""),
      spreadBps: Number(d.spreadBps ?? 0),
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
        WHERE agent_id = $1 AND message IN ('arb_complete', 'arb_failed')
     ORDER BY ts DESC`,
      [agentId],
    );
    totalTrades = trades.rows.length;
    for (const row of trades.rows) {
      const d = row.data as Record<string, unknown>;
      const pnl = Number(d.actualProfit ?? 0);
      const amount = Number(d.totalAmount ?? 0);
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
