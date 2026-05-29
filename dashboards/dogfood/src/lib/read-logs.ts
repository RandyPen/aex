import fs from "fs";
import type { Agent, BalanceSnapshot, AgentEvent, PositionData, PerformanceData, VolatilityData, YieldScanData } from "./types";

const LOG_DIR = process.env.LOG_DIR || "./logs";
const IS_VERCEL = process.env.VERCEL === "1";

interface LogEntry {
  ts: string;
  agent: string;
  level: string;
  message: string;
  [key: string]: unknown;
}

function parseLogFile(agentId: string): LogEntry[] {
  if (IS_VERCEL) return [];
  const logPath = `${LOG_DIR}/${agentId}.log`;
  try {
    const content = fs.readFileSync(logPath, "utf-8");
    return content
      .trim()
      .split("\n")
      .filter(Boolean)
      .map((line) => {
        try {
          return JSON.parse(line) as LogEntry;
        } catch {
          return null;
        }
      })
      .filter((e): e is LogEntry => e !== null);
  } catch {
    return [];
  }
}

export function getBalanceHistory(agentId: string): BalanceSnapshot[] {
  const entries = parseLogFile(agentId);
  return entries
    .filter((e) => e.message === "balance_snapshot")
    .map((e) => ({
      ts: e.ts,
      balance: Number(e.balance) || 0,
      usdcBalance: e.usdcBalance !== undefined ? Number(e.usdcBalance) : undefined,
    }));
}

export function getAgentEvents(agentId: string): AgentEvent[] {
  const entries = parseLogFile(agentId);
  return entries
    .filter((e) => e.level === "event" || e.level === "error" || e.level === "warn" || e.message === "Monitor: opened" || e.message?.startsWith("Monitor:") || e.message?.startsWith("Simulated") || e.message === "Agent starting" || e.message === "Cycle")
    .slice(-50)
    .reverse()
    .map((e) => ({
      ts: e.ts,
      type: e.level === "event" ? String(e.message) : e.level,
      level: e.level as AgentEvent["level"],
      message: formatMessage(e),
      data: e as Record<string, unknown>,
      txHash: e.txHash as string | undefined,
    }));
}

function formatMessage(e: LogEntry): string {
  if (e.message === "balance_snapshot") return `Balance: ${Number(e.balance).toFixed(4)} SUI`;
  if (e.message === "Cycle") return `Pool tick: ${e.tick}, Balance: ${e.balance} SUI`;
  if (e.message === "Agent starting") return `Agent started (${e.mode} mode)`;
  if (typeof e.message === "string" && e.message.startsWith("sim_")) {
    const action = e.message.replace("sim_", "").replace(/_/g, " ");
    if (e.drift) return `${action} (drift: ${e.drift} ticks)`;
    if (e.tickLower) return `${action} [${e.tickLower}, ${e.tickUpper}]`;
    return action;
  }
  if (e.message === "Monitor: opened") return `Simulated position opened [${e.tickLower}, ${e.tickUpper}]`;
  if (typeof e.message === "string" && e.message.startsWith("Monitor:")) return e.message;
  if (e.message === "position_status") return `Position status: drift ${e.drift} ticks`;
  return String(e.message);
}

export function getPositionData(agentId: string): PositionData | null {
  const entries = parseLogFile(agentId);

  // Derive positionOpenedAt from logs (agent loses this on restart)
  let logPositionOpenedAt: string | null = null;
  for (let i = entries.length - 1; i >= 0; i--) {
    const e = entries[i];
    if ((e.message === "position_opened" && e.txHash) || e.message === "rebalance_complete") {
      logPositionOpenedAt = e.ts;
      break;
    }
  }

  // Look for the latest position_status event (Phase 2 enhanced logging)
  for (let i = entries.length - 1; i >= 0; i--) {
    const e = entries[i];
    if (e.message === "position_status") {
      return {
        tickLower: Number(e.tickLower),
        tickUpper: Number(e.tickUpper),
        currentTick: Number(e.currentTick),
        drift: Number(e.drift),
        threshold: Number(e.threshold),
        rangeWidth: Number(e.rangeWidth),
        inRange: Boolean(e.inRange),
        timeInRangePct: Number(e.timeInRangePct) || 100,
        positionOpenedAt: (e.positionOpenedAt as string) || logPositionOpenedAt,
        rebalanceCount: Number(e.rebalanceCount) || 0,
        liquidity: String(e.liquidity || "0"),
      };
    }
  }

  // Fallback: reconstruct from legacy logs
  let tickLower = 0, tickUpper = 0, currentTick = 0, drift = 0, threshold = 100;
  let positionOpenedAt: string | null = null;
  let rebalanceCount = 0;

  for (const e of entries) {
    if (e.message === "position_opened" || e.message === "rebalance_complete") {
      tickLower = Number(e.tickLower || e.newTickLower) || tickLower;
      tickUpper = Number(e.tickUpper || e.newTickUpper) || tickUpper;
      positionOpenedAt = e.ts;
      if (e.message === "rebalance_complete") rebalanceCount++;
    }
    if (e.message === "Position in range" || e.message === "out_of_range" || e.message === "drift_detected") {
      currentTick = Number(e.currentTick) || currentTick;
      drift = Number(e.drift) || drift;
      threshold = Number(e.threshold) || threshold;
    }
  }

  if (tickLower === 0 && tickUpper === 0) return null;

  const inRange = currentTick >= tickLower && currentTick <= tickUpper;
  // Estimate time in range from logs
  const positionChecks = entries.filter(e =>
    e.message === "Position in range" || e.message === "out_of_range" || e.message === "drift_detected"
  );
  const inRangeChecks = positionChecks.filter(e => e.message === "Position in range").length;
  const timeInRangePct = positionChecks.length > 0 ? Math.round((inRangeChecks / positionChecks.length) * 100) : 100;

  return {
    tickLower,
    tickUpper,
    currentTick,
    drift,
    threshold,
    rangeWidth: tickUpper - tickLower,
    inRange,
    timeInRangePct,
    positionOpenedAt,
    rebalanceCount,
    liquidity: "0",
  };
}

export function getPerformanceData(agentId: string): PerformanceData {
  const entries = parseLogFile(agentId);
  const balanceSnapshots = entries.filter(e => e.message === "balance_snapshot");

  const initialBalance = balanceSnapshots.length > 0 ? Number(balanceSnapshots[0].balance) : 0;
  const currentBalance = balanceSnapshots.length > 0 ? Number(balanceSnapshots[balanceSnapshots.length - 1].balance) : 0;

  // Find the balance right after the first real position was opened (post-deposit baseline)
  // The initial large balance includes pre-LP funds; the real baseline is post-deposit
  let postDepositBalance = initialBalance;
  let foundPosition = false;
  for (const e of entries) {
    if (e.message === "position_opened" && e.txHash && !foundPosition) {
      foundPosition = true;
      continue;
    }
    if (foundPosition && e.message === "balance_snapshot") {
      postDepositBalance = Number(e.balance);
      break;
    }
  }

  // Use post-deposit balance as baseline if a position was opened
  const baseline = foundPosition ? postDepositBalance : initialBalance;
  const pnl = currentBalance - baseline;
  const pnlPct = baseline > 0 ? (pnl / baseline) * 100 : 0;

  // Count rebalances
  const rebalanceCount = entries.filter(e => e.message === "rebalance_complete").length;

  // Get gas from latest position_status or estimate
  let totalGasSpent = 0;
  for (let i = entries.length - 1; i >= 0; i--) {
    if (entries[i].message === "position_status" && entries[i].totalGasSpent) {
      totalGasSpent = Number(entries[i].totalGasSpent);
      break;
    }
  }
  // Fallback: estimate from tx count
  if (totalGasSpent === 0) {
    const txEvents = entries.filter(e => e.txHash);
    totalGasSpent = txEvents.length * 0.01;
  }

  // Calculate uptime
  const startEntries = entries.filter(e => e.message === "Agent starting");
  let uptimeHours = 0;
  if (startEntries.length > 0) {
    const firstStart = new Date(startEntries[0].ts).getTime();
    uptimeHours = (Date.now() - firstStart) / 3600000;
  }

  // Estimate APY from balance change over time (using post-deposit baseline)
  let estimatedApy = 0;
  if (uptimeHours > 1 && baseline > 0) {
    const hourlyReturn = pnl / uptimeHours;
    const annualReturn = hourlyReturn * 8760;
    estimatedApy = (annualReturn / baseline) * 100;
  }

  return {
    initialBalance: baseline,
    currentBalance,
    pnl,
    pnlPct,
    totalGasSpent,
    rebalanceCount,
    uptimeHours,
    estimatedApy,
  };
}

export function getVolatilityData(agentId: string): VolatilityData {
  const entries = parseLogFile(agentId);

  // Get from latest position_status or Cycle logs
  for (let i = entries.length - 1; i >= 0; i--) {
    const e = entries[i];
    if (e.message === "position_status" && e.volatility !== undefined) {
      const volatility = Number(e.volatility);
      const adaptiveRange = Number(e.adaptiveRange) || 200;
      const baseRange = Number(e.baseRange) || 200;
      return {
        volatility,
        volatilitySamples: Number(e.volatilitySamples) || 0,
        adaptiveRange,
        baseRange,
        recommendation: getVolatilityRecommendation(volatility, adaptiveRange, baseRange),
      };
    }
  }

  // Fallback: calculate from Cycle logs
  const cycleLogs = entries.filter(e => e.message === "Cycle" && e.tick !== undefined);
  if (cycleLogs.length < 2) {
    return { volatility: 0, volatilitySamples: 0, adaptiveRange: 200, baseRange: 200, recommendation: "Not enough data" };
  }

  const ticks = cycleLogs.slice(-60).map(e => Number(e.tick));
  const changes = [];
  for (let i = 1; i < ticks.length; i++) {
    changes.push(Math.abs(ticks[i] - ticks[i - 1]));
  }
  const mean = changes.reduce((a, b) => a + b, 0) / changes.length;
  const variance = changes.reduce((a, b) => a + (b - mean) ** 2, 0) / changes.length;
  const volatility = Math.sqrt(variance);

  return {
    volatility,
    volatilitySamples: ticks.length,
    adaptiveRange: 200,
    baseRange: 200,
    recommendation: getVolatilityRecommendation(volatility, 200, 200),
  };
}

function getVolatilityRecommendation(volatility: number, adaptiveRange: number, baseRange: number): string {
  if (volatility < 5) return "The market is very calm. A narrow earning zone captures the most fees per trade.";
  if (volatility < 20) return "The market is calm. The current earning zone is well-sized for steady fee income.";
  if (volatility < 50) return "Moderate price movement. The agent balances earning efficiency against the cost of repositioning.";
  if (volatility < 100) return "The market is moving a lot. A wider earning zone avoids frequent, costly repositions.";
  return "Very choppy market. The agent is using its widest earning zone to minimize reposition costs.";
}

export function getAgentStatus(agentId: string): {
  status: "running" | "stopped" | "error";
  uptime: string;
  lastActivity: string;
} {
  const entries = parseLogFile(agentId);
  if (entries.length === 0) {
    return { status: "stopped", uptime: "--", lastActivity: "never" };
  }

  const last = entries[entries.length - 1];
  const lastTime = new Date(last.ts).getTime();
  const now = Date.now();
  const ageSec = (now - lastTime) / 1000;

  const checkInterval = parseInt(process.env.CHECK_INTERVAL_MS || "300000") / 1000;
  const status = ageSec > checkInterval * 2 ? "stopped" : last.level === "error" ? "error" : "running";

  const startEntry = entries.find((e) => e.message === "Agent starting");
  let uptime = "--";
  if (startEntry) {
    const startTime = new Date(startEntry.ts).getTime();
    const uptimeMs = now - startTime;
    const hours = Math.floor(uptimeMs / 3600000);
    const mins = Math.floor((uptimeMs % 3600000) / 60000);
    uptime = hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
  }

  let lastActivity: string;
  if (ageSec < 60) lastActivity = "just now";
  else if (ageSec < 3600) lastActivity = `${Math.floor(ageSec / 60)} min ago`;
  else lastActivity = `${Math.floor(ageSec / 3600)}h ago`;

  return { status, uptime, lastActivity };
}

export function getYieldScanData(agentId: string): YieldScanData | null {
  const entries = parseLogFile(agentId);

  // Find the latest yield_scan event
  for (let i = entries.length - 1; i >= 0; i--) {
    const e = entries[i];
    if (e.message === "yield_scan") {
      return {
        cetusTopPools: (e.cetusTopPools as YieldScanData["cetusTopPools"]) || [],
        crossProtocol: (e.crossProtocol as YieldScanData["crossProtocol"]) || [],
        currentPool: e.currentPool as YieldScanData["currentPool"],
        bestAlternative: (e.bestAlternative as YieldScanData["bestAlternative"]) || null,
        scanTime: (e.scanTime as string) || e.ts,
      };
    }
  }

  return null;
}
