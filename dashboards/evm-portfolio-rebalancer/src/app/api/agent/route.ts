import { NextResponse } from "next/server";
import {
  getBalanceHistoryFromDb,
  getAgentEventsFromDb,
  getAgentStatusFromDb,
  getRebalanceHistoryFromDb,
  getAllocationStateFromDb,
  getThresholdStateFromDb,
  getPriceHistoryFromDb,
  getPnLFromDb,
  getAgentMetadata,
} from "@/lib/read-neon";
import {
  agents,
  generateBalanceHistory,
  generateEvents,
  generateRebalanceHistory,
  generateAllocationState,
  generateThresholdState,
  generatePriceHistory,
  generatePnL,
} from "@/lib/mock-data";
import { HAS_DB } from "@/lib/db";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const agentId = searchParams.get("id") || "evm-portfolio-rebalancer-base";

  if (HAS_DB) {
    const meta = await getAgentMetadata(agentId);
    if (!meta) {
      return NextResponse.json({ error: "Agent not found" }, { status: 404 });
    }
    const [balanceHistory, events, liveStatus, rebalances, allocation, threshold, priceHistory, pnl] = await Promise.all([
      getBalanceHistoryFromDb(agentId),
      getAgentEventsFromDb(agentId),
      getAgentStatusFromDb(agentId),
      getRebalanceHistoryFromDb(agentId),
      getAllocationStateFromDb(agentId),
      getThresholdStateFromDb(agentId),
      getPriceHistoryFromDb(agentId),
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
        protocol: meta.protocol ?? mockAgent?.protocol ?? "Portfolio Rebalancer",
        walletAddress: meta.wallet_address ?? mockAgent?.walletAddress ?? "",
        status: liveStatus.status,
        uptime: liveStatus.uptime,
        lastActivity: liveStatus.lastActivity,
      },
      balanceHistory,
      events,
      rebalances,
      allocation,
      threshold,
      priceHistory,
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
    allocation: generateAllocationState(),
    threshold: generateThresholdState(),
    priceHistory: generatePriceHistory(),
    pnl: generatePnL(),
  });
}
