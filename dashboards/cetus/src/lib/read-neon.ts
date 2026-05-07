import { getPool } from "./db";
import type {
  BalanceSnapshot,
  AgentEvent,
  PositionData,
  PerformanceData,
  VolatilityData,
  YieldScanData,
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

export async function getPositionDataFromDb(agentId: string): Promise<PositionData | null> {
  const pool = getPool();
  if (!pool) return null;
  const r = await pool.query(
    `SELECT ts, data
       FROM agent_events
      WHERE agent_id = $1 AND message = 'position_status'
   ORDER BY ts DESC
      LIMIT 1`,
    [agentId],
  );
  if (!r.rows.length) return null;
  const d = r.rows[0].data as Record<string, unknown>;
  return {
    tickLower: Number(d.tickLower ?? 0),
    tickUpper: Number(d.tickUpper ?? 0),
    currentTick: Number(d.currentTick ?? 0),
    drift: Number(d.drift ?? 0),
    threshold: Number(d.threshold ?? 0),
    rangeWidth: Number(d.rangeWidth ?? 0),
    inRange: Boolean(d.inRange),
    timeInRangePct: Number(d.timeInRangePct ?? 0),
    positionOpenedAt: typeof d.positionOpenedAt === "string" ? (d.positionOpenedAt as string) : null,
    rebalanceCount: Number(d.rebalanceCount ?? 0),
    liquidity: String(d.liquidity ?? "0"),
  };
}

export async function getPerformanceDataFromDb(agentId: string): Promise<PerformanceData> {
  const balances = await getBalanceHistoryFromDb(agentId);
  const initial = balances[0]?.balance ?? 0;
  const current = balances[balances.length - 1]?.balance ?? 0;
  const pnl = current - initial;
  const pnlPct = initial > 0 ? (pnl / initial) * 100 : 0;

  const pool = getPool();
  let gasSpent = 0;
  let rebalanceCount = 0;
  if (pool) {
    const lastPos = await pool.query(
      `SELECT data FROM agent_events
        WHERE agent_id = $1 AND message = 'position_status'
     ORDER BY ts DESC LIMIT 1`,
      [agentId],
    );
    if (lastPos.rows.length) {
      const d = lastPos.rows[0].data as Record<string, unknown>;
      gasSpent = parseFloat(String(d.totalGasSpent ?? "0"));
      rebalanceCount = Number(d.rebalanceCount ?? 0);
    }
  }

  // Compute uptimeHours from earliest event ts
  const pool2 = getPool();
  let uptimeHours = 0;
  if (pool2) {
    const first = await pool2.query(`SELECT MIN(ts) AS first_ts FROM agent_events WHERE agent_id = $1`, [agentId]);
    if (first.rows[0]?.first_ts) {
      uptimeHours = (Date.now() - new Date(first.rows[0].first_ts).getTime()) / 3_600_000;
    }
  }

  const estimatedApy = uptimeHours > 0 ? (pnlPct / uptimeHours) * 24 * 365 : 0;

  return {
    initialBalance: initial,
    currentBalance: current,
    pnl,
    pnlPct,
    totalGasSpent: gasSpent,
    rebalanceCount,
    uptimeHours,
    estimatedApy,
  };
}

export async function getVolatilityDataFromDb(agentId: string): Promise<VolatilityData> {
  const pool = getPool();
  const empty: VolatilityData = { volatility: 0, volatilitySamples: 0, adaptiveRange: 0, baseRange: 0, recommendation: "" };
  if (!pool) return empty;
  const r = await pool.query(
    `SELECT data FROM agent_events
      WHERE agent_id = $1 AND message IN ('Cycle','position_status')
   ORDER BY ts DESC LIMIT 1`,
    [agentId],
  );
  if (!r.rows.length) return empty;
  const d = r.rows[0].data as Record<string, unknown>;
  const volatility = parseFloat(String(d.volatility ?? "0"));
  const recommendation = volatility < 3 ? "tighter range — low volatility" : volatility < 6 ? "balanced range" : "wider range — high volatility";
  return {
    volatility,
    volatilitySamples: Number(d.volatilitySamples ?? 0),
    adaptiveRange: Number(d.adaptiveRange ?? 0),
    baseRange: Number(d.baseRange ?? 200),
    recommendation,
  };
}

export async function getAgentStatusFromDb(agentId: string): Promise<{ status: "running" | "stopped" | "error"; uptime: string; lastActivity: string }> {
  const pool = getPool();
  if (!pool) return { status: "stopped", uptime: "—", lastActivity: "—" };
  const r = await pool.query(
    `SELECT ts FROM agent_events WHERE agent_id = $1 ORDER BY ts DESC LIMIT 1`,
    [agentId],
  );
  if (!r.rows.length) return { status: "stopped", uptime: "no events", lastActivity: "never" };
  const lastTs = new Date(r.rows[0].ts);
  const now = new Date();
  const ageMs = now.getTime() - lastTs.getTime();
  // Consider running if last event within 10 minutes (cycle is 5 min)
  const isRunning = ageMs < 10 * 60 * 1000;
  const lastActivity = formatRelative(ageMs);
  return {
    status: isRunning ? "running" : "stopped",
    uptime: isRunning ? "active" : "stale",
    lastActivity,
  };
}

export async function getYieldScanDataFromDb(agentId: string): Promise<YieldScanData | null> {
  const pool = getPool();
  if (!pool) return null;
  const r = await pool.query(
    `SELECT ts, data FROM agent_events
      WHERE agent_id = $1 AND message = 'yield_scan'
   ORDER BY ts DESC LIMIT 1`,
    [agentId],
  );
  if (!r.rows.length) return null;
  const d = r.rows[0].data as Record<string, unknown>;
  return {
    cetusTopPools: (d.cetusTopPools as unknown[]) ?? [],
    crossProtocol: (d.crossProtocol as unknown[]) ?? [],
    currentPool: (d.currentPool as Record<string, unknown>) ?? null,
    bestAlternative: (d.bestAlternative as Record<string, unknown>) ?? null,
    totalSuiPools: Number(d.totalSuiPools ?? 0),
    scanTime: String(d.scanTime ?? r.rows[0].ts),
  } as unknown as YieldScanData;
}

function formatRelative(ms: number): string {
  if (ms < 60_000) return `${Math.round(ms / 1000)}s ago`;
  if (ms < 3600_000) return `${Math.round(ms / 60_000)}m ago`;
  if (ms < 86400_000) return `${Math.round(ms / 3600_000)}h ago`;
  return `${Math.round(ms / 86400_000)}d ago`;
}

export async function getAgentMetadata(agentId: string) {
  const pool = getPool();
  if (!pool) return null;
  const r = await pool.query(`SELECT id, name, description, chain, protocol, category, wallet_address, started_at, metadata FROM agents WHERE id = $1`, [agentId]);
  return r.rows[0] ?? null;
}
