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

export async function PUT(req: Request) {
  const pool = getPool();
  if (!pool) return NextResponse.json({ error: "no database" }, { status: 500 });

  const body = await req.json();
  const { id, name, description, chain, protocol, category, walletAddress } = body;
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  await pool.query(
    `UPDATE agents SET
       name = COALESCE($2, name),
       description = COALESCE($3, description),
       chain = COALESCE($4, chain),
       protocol = COALESCE($5, protocol),
       category = COALESCE($6, category),
       wallet_address = COALESCE($7, wallet_address)
     WHERE id = $1`,
    [id, name, description, chain, protocol, category, walletAddress],
  );

  return NextResponse.json({ updated: id });
}
