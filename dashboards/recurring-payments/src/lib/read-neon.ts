import { getPool } from "./db";
import type {
  BalanceSnapshot,
  AgentEvent,
  PaymentScheduleItem,
  PaymentEvent,
  PaymentStats,
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
    `SELECT ts, balance
       FROM agent_balance_snapshots
      WHERE agent_id = $1
   ORDER BY ts ASC
      LIMIT 1000`,
    [agentId],
  );
  return r.rows.map((row) => ({
    ts: row.ts.toISOString ? row.ts.toISOString() : String(row.ts),
    balance: Number(row.balance),
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

export async function getPaymentSchedulesFromDb(agentId: string): Promise<PaymentScheduleItem[]> {
  const pool = getPool();
  if (!pool) return [];
  const r = await pool.query(
    `SELECT ts, data
       FROM agent_events
      WHERE agent_id = $1 AND message = 'schedule_snapshot'
   ORDER BY ts DESC
      LIMIT 1`,
    [agentId],
  );
  if (!r.rows.length) return [];
  const d = r.rows[0].data as Record<string, unknown>;
  const schedules = (d.schedules as unknown[]) ?? [];
  return (schedules as Record<string, unknown>[]).map((s) => ({
    id: String(s.id ?? ""),
    recipient: String(s.recipient ?? ""),
    label: String(s.label ?? ""),
    token: String(s.token ?? ""),
    amount: Number(s.amount ?? 0),
    interval: String(s.interval ?? "monthly") as PaymentScheduleItem["interval"],
    nextDueDate: String(s.nextDueDate ?? ""),
    lastPaidDate: s.lastPaidDate ? String(s.lastPaidDate) : null,
    status: String(s.status ?? "active") as PaymentScheduleItem["status"],
  }));
}

export async function getPaymentHistoryFromDb(agentId: string): Promise<PaymentEvent[]> {
  const pool = getPool();
  if (!pool) return [];
  const r = await pool.query(
    `SELECT ts, data
       FROM agent_events
      WHERE agent_id = $1 AND message IN ('payment_sent', 'payment_failed')
   ORDER BY ts DESC
      LIMIT 200`,
    [agentId],
  );
  return r.rows.map((row) => {
    const d = row.data as Record<string, unknown>;
    return {
      ts: row.ts.toISOString ? row.ts.toISOString() : String(row.ts),
      scheduleId: String(d.scheduleId ?? ""),
      recipient: String(d.recipient ?? ""),
      label: String(d.label ?? ""),
      amount: Number(d.amount ?? 0),
      token: String(d.token ?? ""),
      txHash: String(d.txHash ?? ""),
      status: String(d.status ?? "sent") as PaymentEvent["status"],
    };
  });
}

export async function getPaymentStatsFromDb(agentId: string): Promise<PaymentStats> {
  const pool = getPool();
  const defaultStats: PaymentStats = {
    totalPaymentsSent: 0,
    totalUsdValue: 0,
    activeSchedules: 0,
    nextPaymentDue: "",
    paymentsThisMonth: 0,
    failedPayments: 0,
    totalSchedules: 0,
  };
  if (!pool) return defaultStats;

  const payments = await pool.query(
    `SELECT data FROM agent_events WHERE agent_id = $1 AND message IN ('payment_sent', 'payment_failed') ORDER BY ts DESC`,
    [agentId],
  );

  const now = Date.now();
  const monthAgo = now - 30 * 24 * 60 * 60 * 1000;
  let totalSent = 0, totalUsd = 0, failed = 0, thisMonth = 0;

  for (const row of payments.rows) {
    const d = row.data as Record<string, unknown>;
    const status = String(d.status ?? "sent");
    const ts = new Date(String(d.ts ?? "")).getTime();
    if (status === "sent") {
      totalSent++;
      totalUsd += Number(d.usdValue ?? d.amount ?? 0);
    }
    if (status === "failed") failed++;
    if (ts > monthAgo) thisMonth++;
  }

  return {
    totalPaymentsSent: totalSent,
    totalUsdValue: totalUsd,
    activeSchedules: 0,
    nextPaymentDue: "",
    paymentsThisMonth: thisMonth,
    failedPayments: failed,
    totalSchedules: 0,
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
