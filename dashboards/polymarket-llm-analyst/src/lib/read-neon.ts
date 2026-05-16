import { getPool } from "./db";
import type {
  BalanceSnapshot,
  AgentEvent,
  TradeEvent,
  PositionData,
  PnLData,
  MarketData,
  AnalysisEvent,
  LLMStatsData,
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

export async function getTradesFromDb(agentId: string): Promise<TradeEvent[]> {
  const pool = getPool();
  if (!pool) return [];
  const r = await pool.query(
    `SELECT ts, data
       FROM agent_events
      WHERE agent_id = $1 AND message IN ('trade_placed', 'trade_filled', 'trade_cancelled')
   ORDER BY ts DESC
      LIMIT 200`,
    [agentId],
  );
  return r.rows.map((row) => {
    const d = row.data as Record<string, unknown>;
    return {
      ts: row.ts.toISOString ? row.ts.toISOString() : String(row.ts),
      marketId: String(d.marketId ?? ""),
      marketQuestion: String(d.marketQuestion ?? "Unknown market"),
      side: (d.side === "NO" ? "NO" : "YES") as "YES" | "NO",
      amount: Number(d.amount ?? 0),
      price: Number(d.price ?? 0),
      status: String(d.status ?? "filled") as TradeEvent["status"],
      txHash: typeof d.txHash === "string" ? d.txHash : undefined,
    };
  });
}

export async function getPositionsFromDb(agentId: string): Promise<PositionData[]> {
  const pool = getPool();
  if (!pool) return [];
  const r = await pool.query(
    `SELECT ts, data
       FROM agent_events
      WHERE agent_id = $1 AND message = 'position_snapshot'
   ORDER BY ts DESC
      LIMIT 1`,
    [agentId],
  );
  if (!r.rows.length) return [];
  const d = r.rows[0].data as Record<string, unknown>;
  const positions = (d.positions as unknown[]) ?? [];
  return (positions as Record<string, unknown>[]).map((p) => ({
    marketId: String(p.marketId ?? ""),
    marketQuestion: String(p.marketQuestion ?? "Unknown market"),
    side: (p.side === "NO" ? "NO" : "YES") as "YES" | "NO",
    amount: Number(p.amount ?? 0),
    avgPrice: Number(p.avgPrice ?? 0),
    currentPrice: Number(p.currentPrice ?? 0),
    pnl: Number(p.pnl ?? 0),
    pnlPct: Number(p.pnlPct ?? 0),
  }));
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
        WHERE agent_id = $1 AND message IN ('trade_filled', 'trade_settled')
     ORDER BY ts DESC`,
      [agentId],
    );
    totalTrades = trades.rows.length;
    for (const row of trades.rows) {
      const d = row.data as Record<string, unknown>;
      const pnl = Number(d.pnl ?? 0);
      const amount = Number(d.amount ?? 0);
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

export async function getWatchedMarketsFromDb(agentId: string): Promise<MarketData[]> {
  const pool = getPool();
  if (!pool) return [];
  const r = await pool.query(
    `SELECT ts, data
       FROM agent_events
      WHERE agent_id = $1 AND message = 'market_scan'
   ORDER BY ts DESC
      LIMIT 1`,
    [agentId],
  );
  if (!r.rows.length) return [];
  const d = r.rows[0].data as Record<string, unknown>;
  const markets = (d.markets as unknown[]) ?? [];
  return (markets as Record<string, unknown>[]).map((m) => ({
    marketId: String(m.marketId ?? ""),
    question: String(m.question ?? ""),
    category: String(m.category ?? ""),
    volume24h: Number(m.volume24h ?? 0),
    liquidity: Number(m.liquidity ?? 0),
    endDate: String(m.endDate ?? ""),
    yesPrice: Number(m.yesPrice ?? 0.5),
    noPrice: Number(m.noPrice ?? 0.5),
    watchReason: String(m.watchReason ?? ""),
  }));
}

export async function getAnalysesFromDb(agentId: string): Promise<AnalysisEvent[]> {
  const pool = getPool();
  if (!pool) return [];
  const r = await pool.query(
    `SELECT ts, data
       FROM agent_events
      WHERE agent_id = $1 AND message = 'llm_analysis'
   ORDER BY ts DESC
      LIMIT 500`,
    [agentId],
  );
  return r.rows.map((row) => {
    const d = row.data as Record<string, unknown>;
    return {
      ts: row.ts.toISOString ? row.ts.toISOString() : String(row.ts),
      marketId: String(d.marketId ?? ""),
      marketQuestion: String(d.marketQuestion ?? "Unknown market"),
      side: (d.side === "NO" ? "NO" : "YES") as "YES" | "NO",
      confidence: Number(d.confidence ?? 0),
      reasoning: String(d.reasoning ?? ""),
      traded: Boolean(d.traded),
      llmProvider: typeof d.llmProvider === "string" ? d.llmProvider : undefined,
      llmModel: typeof d.llmModel === "string" ? d.llmModel : undefined,
      promptTokens: typeof d.promptTokens === "number" ? d.promptTokens : undefined,
      completionTokens: typeof d.completionTokens === "number" ? d.completionTokens : undefined,
      costEstimate: typeof d.costEstimate === "number" ? d.costEstimate : undefined,
    };
  });
}

export async function getLLMStatsFromDb(agentId: string): Promise<LLMStatsData> {
  const pool = getPool();
  const defaultStats: LLMStatsData = {
    totalAnalyses: 0,
    tradesPlaced: 0,
    tradesSkipped: 0,
    avgConfidence: 0,
    winRateOnTrades: 0,
    llmProvider: "Unknown",
    llmModel: "Unknown",
    totalLLMCost: 0,
    confidenceThreshold: 0.72,
  };
  if (!pool) return defaultStats;

  const r = await pool.query(
    `SELECT data FROM agent_events WHERE agent_id = $1 AND message = 'llm_analysis' ORDER BY ts DESC`,
    [agentId],
  );
  if (!r.rows.length) return defaultStats;

  let totalConfidence = 0;
  let tradesPlaced = 0;
  let tradesSkipped = 0;
  let totalCost = 0;
  let lastProvider = "Unknown";
  let lastModel = "Unknown";

  for (const row of r.rows) {
    const d = row.data as Record<string, unknown>;
    totalConfidence += Number(d.confidence ?? 0);
    if (d.traded) tradesPlaced++;
    else tradesSkipped++;
    totalCost += Number(d.costEstimate ?? 0);
    if (typeof d.llmProvider === "string") lastProvider = d.llmProvider;
    if (typeof d.llmModel === "string") lastModel = d.llmModel;
  }

  const pnl = await getPnLFromDb(agentId);

  return {
    totalAnalyses: r.rows.length,
    tradesPlaced,
    tradesSkipped,
    avgConfidence: r.rows.length > 0 ? totalConfidence / r.rows.length : 0,
    winRateOnTrades: pnl.winRate,
    llmProvider: lastProvider,
    llmModel: lastModel,
    totalLLMCost: totalCost,
    confidenceThreshold: 0.72,
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
