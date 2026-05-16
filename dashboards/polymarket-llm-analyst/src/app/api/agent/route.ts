import { NextResponse } from "next/server";
import {
  getBalanceHistoryFromDb,
  getAgentEventsFromDb,
  getAgentStatusFromDb,
  getTradesFromDb,
  getPositionsFromDb,
  getPnLFromDb,
  getWatchedMarketsFromDb,
  getAnalysesFromDb,
  getLLMStatsFromDb,
  getAgentMetadata,
} from "@/lib/read-neon";
import {
  agents,
  generateBalanceHistory,
  generateEvents,
  generateTrades,
  generatePositions,
  generatePnL,
  generateWatchedMarkets,
  generateAnalyses,
  generateLLMStats,
} from "@/lib/mock-data";
import { HAS_DB } from "@/lib/db";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const agentId = searchParams.get("id") || "poly-llm-analyst";

  if (HAS_DB) {
    const meta = await getAgentMetadata(agentId);
    if (!meta) {
      return NextResponse.json({ error: "Agent not found" }, { status: 404 });
    }
    const [balanceHistory, events, liveStatus, trades, positions, pnl, watchedMarkets, analyses, llmStats] = await Promise.all([
      getBalanceHistoryFromDb(agentId),
      getAgentEventsFromDb(agentId),
      getAgentStatusFromDb(agentId),
      getTradesFromDb(agentId),
      getPositionsFromDb(agentId),
      getPnLFromDb(agentId),
      getWatchedMarketsFromDb(agentId),
      getAnalysesFromDb(agentId),
      getLLMStatsFromDb(agentId),
    ]);
    const mockAgent = agents.find((a) => a.id === agentId);
    return NextResponse.json({
      agent: {
        ...(mockAgent ?? {}),
        id: meta.id,
        name: meta.name,
        description: meta.description ?? mockAgent?.description ?? "",
        chain: meta.chain ?? mockAgent?.chain ?? "Polygon",
        protocol: meta.protocol ?? mockAgent?.protocol ?? "Polymarket",
        walletAddress: meta.wallet_address ?? mockAgent?.walletAddress ?? "",
        status: liveStatus.status,
        uptime: liveStatus.uptime,
        lastActivity: liveStatus.lastActivity,
      },
      balanceHistory,
      events,
      trades,
      positions,
      pnl,
      watchedMarkets,
      analyses,
      llmStats,
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
    trades: generateTrades(),
    positions: generatePositions(),
    pnl: generatePnL(),
    watchedMarkets: generateWatchedMarkets(),
    analyses: generateAnalyses(),
    llmStats: generateLLMStats(),
  });
}
