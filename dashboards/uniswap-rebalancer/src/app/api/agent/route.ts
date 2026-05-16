import { NextResponse } from "next/server";
import {
  getBalanceHistoryFromDb,
  getAgentEventsFromDb,
  getAgentStatusFromDb,
  getRebalanceHistoryFromDb,
  getPoolPositionFromDb,
  getFeeDataFromDb,
  getDriftHistoryFromDb,
  getPnLFromDb,
  getAgentMetadata,
} from "@/lib/read-neon";
import {
  agents,
  generateBalanceHistory,
  generateEvents,
  generateRebalanceHistory,
  generatePoolPosition,
  generateFeeData,
  generateDriftHistory,
  generatePnL,
} from "@/lib/mock-data";
import { HAS_DB } from "@/lib/db";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const agentId = searchParams.get("id") || "uni-v3-rebalancer-base";

  if (HAS_DB) {
    const meta = await getAgentMetadata(agentId);
    if (!meta) {
      return NextResponse.json({ error: "Agent not found" }, { status: 404 });
    }
    const [balanceHistory, events, liveStatus, rebalances, position, fees, driftHistory, pnl] = await Promise.all([
      getBalanceHistoryFromDb(agentId),
      getAgentEventsFromDb(agentId),
      getAgentStatusFromDb(agentId),
      getRebalanceHistoryFromDb(agentId),
      getPoolPositionFromDb(agentId),
      getFeeDataFromDb(agentId),
      getDriftHistoryFromDb(agentId),
      getPnLFromDb(agentId),
    ]);
    const mockAgent = agents.find((a) => a.id === agentId);
    return NextResponse.json({
      agent: {
        ...(mockAgent ?? {}),
        id: meta.id,
        name: meta.name,
        description: meta.description ?? mockAgent?.description ?? "",
        chain: meta.chain ?? mockAgent?.chain ?? "Base",
        protocol: meta.protocol ?? mockAgent?.protocol ?? "Uniswap v3",
        walletAddress: meta.wallet_address ?? mockAgent?.walletAddress ?? "",
        status: liveStatus.status,
        uptime: liveStatus.uptime,
        lastActivity: liveStatus.lastActivity,
      },
      balanceHistory,
      events,
      rebalances,
      position,
      fees,
      driftHistory,
      pnl,
    });
  }

  // Fallback: mock data
  const agent = agents.find((a) => a.id === agentId);
  if (!agent) {
    return NextResponse.json({ error: "Agent not found" }, { status: 404 });
  }

  return NextResponse.json({
    agent,
    balanceHistory: generateBalanceHistory(),
    events: generateEvents(),
    rebalances: generateRebalanceHistory(),
    position: generatePoolPosition(),
    fees: generateFeeData(),
    driftHistory: generateDriftHistory(),
    pnl: generatePnL(),
  });
}
