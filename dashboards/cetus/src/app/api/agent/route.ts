import { NextResponse } from "next/server";
import {
  getBalanceHistory,
  getAgentEvents,
  getAgentStatus,
  getPositionData,
  getPerformanceData,
  getVolatilityData,
  getYieldScanData,
} from "@/lib/read-logs";
import {
  getBalanceHistoryFromDb,
  getAgentEventsFromDb,
  getAgentStatusFromDb,
  getPositionDataFromDb,
  getPerformanceDataFromDb,
  getVolatilityDataFromDb,
  getYieldScanDataFromDb,
  getAgentMetadata,
} from "@/lib/read-neon";
import {
  agents,
  generateBalanceHistory,
  generateEvents,
  generatePosition,
  generateYieldScan,
} from "@/lib/mock-data";
import { HAS_DB } from "@/lib/db";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const CETUS_AGENT_IDS = new Set(["cetus-yield-agent", "sui-cetus-yield"]);

function isCetusAgent(id: string, protocol?: string | null): boolean {
  if (CETUS_AGENT_IDS.has(id)) return true;
  return (protocol || "").toLowerCase().includes("cetus");
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const agentId = searchParams.get("id") || "sui-cetus-yield";

  // Prefer Neon when configured. Falls back to log-files / mock if DB unset.
  if (HAS_DB) {
    const meta = await getAgentMetadata(agentId);
    if (!meta) {
      return NextResponse.json({ error: "Agent not found" }, { status: 404 });
    }
    if (!isCetusAgent(meta.id, meta.protocol)) {
      return NextResponse.json({ error: "Agent not in scope of this dashboard" }, { status: 404 });
    }
    const [balanceHistory, events, liveStatus, position, performance, volatility, yieldScan] = await Promise.all([
      getBalanceHistoryFromDb(agentId),
      getAgentEventsFromDb(agentId),
      getAgentStatusFromDb(agentId),
      getPositionDataFromDb(agentId),
      getPerformanceDataFromDb(agentId),
      getVolatilityDataFromDb(agentId),
      getYieldScanDataFromDb(agentId),
    ]);
    const mockAgent = agents.find((a) => a.id === agentId);

    return NextResponse.json({
      agent: {
        ...(mockAgent ?? {}),
        id: meta.id,
        name: meta.name,
        description: meta.description ?? mockAgent?.description ?? "",
        chain: meta.chain ?? mockAgent?.chain ?? "sui",
        protocol: meta.protocol ?? mockAgent?.protocol ?? "cetus",
        category: meta.category ?? mockAgent?.category ?? "yield",
        walletAddress: meta.wallet_address ?? mockAgent?.walletAddress ?? "",
        status: liveStatus.status,
        uptime: liveStatus.uptime,
        lastActivity: liveStatus.lastActivity,
      },
      balanceHistory,
      events,
      position,
      performance,
      volatility,
      yieldScan,
    });
  }

  // Fallback: log-file / mock path
  const agent = agents.find((a) => a.id === agentId);
  if (!agent) {
    return NextResponse.json({ error: "Agent not found" }, { status: 404 });
  }
  if (!isCetusAgent(agent.id, agent.protocol)) {
    return NextResponse.json({ error: "Agent not in scope of this dashboard" }, { status: 404 });
  }

  // Try log-based data first (works for Cetus), fallback to mock generators
  const balanceHistory = getBalanceHistory(agentId);
  const events = getAgentEvents(agentId);
  const liveStatus = getAgentStatus(agentId);
  const position = getPositionData(agentId) ?? generatePosition();
  const performance = getPerformanceData(agentId);
  const volatility = getVolatilityData(agentId);
  const yieldScan = getYieldScanData(agentId) ?? generateYieldScan();

  return NextResponse.json({
    agent: {
      ...agent,
      status: liveStatus.status,
      uptime: liveStatus.uptime,
      lastActivity: liveStatus.lastActivity,
    },
    balanceHistory: balanceHistory.length > 0 ? balanceHistory : generateBalanceHistory(),
    events: events.length > 0 ? events : generateEvents(),
    position,
    performance,
    volatility,
    yieldScan,
  });
}
