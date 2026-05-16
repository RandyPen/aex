import { NextResponse } from "next/server";
import { getPool, HAS_DB } from "@/lib/db";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

interface IncomingEvent {
  ts?: string;
  agent?: string;
  level?: string;
  message?: string;
  [key: string]: unknown;
}

const INGEST_KEY = process.env.INGEST_API_KEY;

function unauthorized() {
  return NextResponse.json({ error: "unauthorized" }, { status: 401 });
}

export async function POST(req: Request) {
  if (!INGEST_KEY) {
    return NextResponse.json({ error: "ingest not configured" }, { status: 503 });
  }
  const provided = req.headers.get("x-cc-api-key") ?? req.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (provided !== INGEST_KEY) return unauthorized();

  if (!HAS_DB) return NextResponse.json({ error: "database not configured" }, { status: 503 });
  const pool = getPool();
  if (!pool) return NextResponse.json({ error: "database unavailable" }, { status: 503 });

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid JSON" }, { status: 400 });
  }

  // Accept either a single event or an array of events
  const events: IncomingEvent[] = Array.isArray(body) ? (body as IncomingEvent[]) : [body as IncomingEvent];
  if (!events.length) return NextResponse.json({ ingested: 0 });

  let ingested = 0;
  let balanceSnapshots = 0;
  const errors: string[] = [];

  for (const evt of events) {
    if (!evt || !evt.agent || !evt.message || !evt.ts) {
      errors.push("missing required fields (ts/agent/message)");
      continue;
    }
    const { ts, agent, level, message, ...rest } = evt;
    const data = rest;

    try {
      // Auto-register unknown agents on first event
      await pool.query(
        `INSERT INTO agents (id, name, chain, protocol, category, wallet_address, metadata, started_at)
         VALUES ($1, $1, 'unknown', 'unknown', 'other', '', '{}', NOW())
         ON CONFLICT (id) DO NOTHING`,
        [agent],
      );

      await pool.query(
        `INSERT INTO agent_events (agent_id, ts, level, message, data) VALUES ($1, $2, $3, $4, $5)`,
        [agent, ts, level ?? "info", message, JSON.stringify(data)],
      );
      ingested++;

      if (message === "balance_snapshot") {
        const balance = typeof data.balance === "number" ? data.balance : null;
        const usdcBalance = typeof data.usdcBalance === "number" ? data.usdcBalance : null;
        await pool.query(
          `INSERT INTO agent_balance_snapshots (agent_id, ts, balance, usdc_balance, data) VALUES ($1, $2, $3, $4, $5)`,
          [agent, ts, balance, usdcBalance, JSON.stringify(data)],
        );
        balanceSnapshots++;
      }
    } catch (e) {
      errors.push(e instanceof Error ? e.message : String(e));
    }
  }

  return NextResponse.json({ ingested, balanceSnapshots, errors: errors.length ? errors : undefined });
}

export async function GET() {
  return NextResponse.json({
    ok: true,
    db: HAS_DB,
    auth: Boolean(INGEST_KEY),
  });
}
