import { getPool } from "./db";
import type {
  BalanceSnapshot,
  AgentEvent,
  VoteEvent,
  Proposal,
  VotingStats,
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

export async function getVoteHistoryFromDb(agentId: string): Promise<VoteEvent[]> {
  const pool = getPool();
  if (!pool) return [];
  const r = await pool.query(
    `SELECT ts, data
       FROM agent_events
      WHERE agent_id = $1 AND message IN ('vote_cast', 'vote_delegated')
   ORDER BY ts DESC
      LIMIT 200`,
    [agentId],
  );
  return r.rows.map((row) => {
    const d = row.data as Record<string, unknown>;
    return {
      ts: row.ts.toISOString ? row.ts.toISOString() : String(row.ts),
      proposalId: String(d.proposalId ?? ""),
      proposalTitle: String(d.proposalTitle ?? "Unknown proposal"),
      spaceName: String(d.spaceName ?? ""),
      choice: (d.choice === "Against" ? "Against" : d.choice === "Abstain" ? "Abstain" : "For") as VoteEvent["choice"],
      votingPower: Number(d.votingPower ?? 0),
      proposalStatus: String(d.proposalStatus ?? "closed") as VoteEvent["proposalStatus"],
      txHash: typeof d.txHash === "string" ? d.txHash : undefined,
    };
  });
}

export async function getProposalsFromDb(agentId: string): Promise<Proposal[]> {
  const pool = getPool();
  if (!pool) return [];
  const r = await pool.query(
    `SELECT ts, data
       FROM agent_events
      WHERE agent_id = $1 AND message = 'proposal_snapshot'
   ORDER BY ts DESC
      LIMIT 1`,
    [agentId],
  );
  if (!r.rows.length) return [];
  const d = r.rows[0].data as Record<string, unknown>;
  const proposals = (d.proposals as unknown[]) ?? [];
  return (proposals as Record<string, unknown>[]).map((p) => ({
    proposalId: String(p.proposalId ?? ""),
    title: String(p.title ?? ""),
    spaceName: String(p.spaceName ?? ""),
    status: String(p.status ?? "active") as Proposal["status"],
    endTs: String(p.endTs ?? ""),
    forVotes: Number(p.forVotes ?? 0),
    againstVotes: Number(p.againstVotes ?? 0),
    abstainVotes: Number(p.abstainVotes ?? 0),
    quorum: Number(p.quorum ?? 0),
    agentVoted: Boolean(p.agentVoted),
    agentChoice: p.agentChoice as Proposal["agentChoice"],
  }));
}

export async function getVotingStatsFromDb(agentId: string): Promise<VotingStats> {
  const pool = getPool();
  const defaultStats: VotingStats = {
    totalVotesCast: 0,
    spacesMonitored: 0,
    participationRate: 0,
    votesThisWeek: 0,
    votesThisMonth: 0,
    forVotes: 0,
    againstVotes: 0,
    abstainVotes: 0,
    avgVotingPower: 0,
  };
  if (!pool) return defaultStats;

  const votes = await pool.query(
    `SELECT data FROM agent_events WHERE agent_id = $1 AND message = 'vote_cast' ORDER BY ts DESC`,
    [agentId],
  );

  const now = Date.now();
  const weekAgo = now - 7 * 24 * 60 * 60 * 1000;
  const monthAgo = now - 30 * 24 * 60 * 60 * 1000;
  let forVotes = 0, againstVotes = 0, abstainVotes = 0, totalPower = 0;
  let votesThisWeek = 0, votesThisMonth = 0;
  const spaces = new Set<string>();

  for (const row of votes.rows) {
    const d = row.data as Record<string, unknown>;
    const ts = new Date(String(d.ts ?? "")).getTime();
    const choice = String(d.choice ?? "");
    if (choice === "For") forVotes++;
    else if (choice === "Against") againstVotes++;
    else abstainVotes++;
    totalPower += Number(d.votingPower ?? 0);
    spaces.add(String(d.spaceName ?? ""));
    if (ts > weekAgo) votesThisWeek++;
    if (ts > monthAgo) votesThisMonth++;
  }

  const total = votes.rows.length;
  return {
    totalVotesCast: total,
    spacesMonitored: spaces.size,
    participationRate: total > 0 ? 100 : 0,
    votesThisWeek,
    votesThisMonth,
    forVotes,
    againstVotes,
    abstainVotes,
    avgVotingPower: total > 0 ? totalPower / total : 0,
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
