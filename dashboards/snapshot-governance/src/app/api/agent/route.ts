import { NextResponse } from "next/server";
import {
  getBalanceHistoryFromDb,
  getAgentEventsFromDb,
  getAgentStatusFromDb,
  getVoteHistoryFromDb,
  getProposalsFromDb,
  getVotingStatsFromDb,
  getAgentMetadata,
} from "@/lib/read-neon";
import {
  agents,
  generateBalanceHistory,
  generateEvents,
  generateVoteHistory,
  generateProposals,
  generateVotingStats,
} from "@/lib/mock-data";
import { HAS_DB } from "@/lib/db";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const agentId = searchParams.get("id") || "snapshot-gov-alpha";

  if (HAS_DB) {
    const meta = await getAgentMetadata(agentId);
    if (!meta) {
      return NextResponse.json({ error: "Agent not found" }, { status: 404 });
    }
    const [balanceHistory, events, liveStatus, votes, proposals, votingStats] = await Promise.all([
      getBalanceHistoryFromDb(agentId),
      getAgentEventsFromDb(agentId),
      getAgentStatusFromDb(agentId),
      getVoteHistoryFromDb(agentId),
      getProposalsFromDb(agentId),
      getVotingStatsFromDb(agentId),
    ]);
    const mockAgent = agents.find((a) => a.id === agentId);
    return NextResponse.json({
      agent: {
        ...(mockAgent ?? {}),
        id: meta.id,
        name: meta.name,
        description: meta.description ?? mockAgent?.description ?? "",
        chain: meta.chain ?? mockAgent?.chain ?? "Ethereum",
        protocol: meta.protocol ?? mockAgent?.protocol ?? "Snapshot",
        walletAddress: meta.wallet_address ?? mockAgent?.walletAddress ?? "",
        status: liveStatus.status,
        uptime: liveStatus.uptime,
        lastActivity: liveStatus.lastActivity,
      },
      balanceHistory,
      events,
      votes,
      proposals,
      votingStats,
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
    votes: generateVoteHistory(),
    proposals: generateProposals(),
    votingStats: generateVotingStats(),
  });
}
