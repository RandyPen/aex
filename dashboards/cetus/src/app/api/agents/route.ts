import { NextResponse } from "next/server";
import { getPool, HAS_DB } from "@/lib/db";
import { agents as mockAgents } from "@/lib/mock-data";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  if (!HAS_DB) {
    return NextResponse.json({ agents: mockAgents });
  }
  const pool = getPool();
  if (!pool) {
    return NextResponse.json({ agents: mockAgents });
  }

  // Pull all registered agents + their latest event timestamp for status inference
  const r = await pool.query(`
    SELECT
      a.id, a.name, a.description, a.chain, a.protocol, a.category,
      a.wallet_address, a.metadata, a.started_at,
      (SELECT MAX(ts) FROM agent_events WHERE agent_id = a.id) AS last_event_ts
    FROM agents a
    ORDER BY a.id
  `);

  const now = Date.now();
  const agents = r.rows.map((row) => {
    const lastTs = row.last_event_ts ? new Date(row.last_event_ts).getTime() : null;
    const ageMs = lastTs ? now - lastTs : null;
    const isRunning = ageMs !== null && ageMs < 35 * 60 * 1000;
    return {
      id: row.id,
      name: row.name,
      description: row.description ?? "",
      chain: row.chain ?? "",
      protocol: row.protocol ?? "",
      category: row.category ?? "",
      walletAddress: row.wallet_address ?? "",
      metadata: row.metadata ?? {},
      startedAt: row.started_at ? new Date(row.started_at).toISOString() : null,
      status: isRunning ? "running" : (lastTs ? "stopped" : "unknown"),
      lastEventTs: lastTs ? new Date(lastTs).toISOString() : null,
      lastEventAgeMs: ageMs,
    };
  });

  return NextResponse.json({ agents });
}
