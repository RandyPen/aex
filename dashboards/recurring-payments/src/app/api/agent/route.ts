import { NextResponse } from "next/server";
import {
  getBalanceHistoryFromDb,
  getAgentEventsFromDb,
  getAgentStatusFromDb,
  getPaymentSchedulesFromDb,
  getPaymentHistoryFromDb,
  getPaymentStatsFromDb,
  getAgentMetadata,
} from "@/lib/read-neon";
import {
  agents,
  generateBalanceHistory,
  generateEvents,
  generatePaymentSchedules,
  generatePaymentHistory,
  generatePaymentStats,
} from "@/lib/mock-data";
import { HAS_DB } from "@/lib/db";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const agentId = searchParams.get("id") || "recurring-pay-alpha";

  if (HAS_DB) {
    const meta = await getAgentMetadata(agentId);
    if (!meta) {
      return NextResponse.json({ error: "Agent not found" }, { status: 404 });
    }
    const [balanceHistory, events, liveStatus, schedules, payments, paymentStats] = await Promise.all([
      getBalanceHistoryFromDb(agentId),
      getAgentEventsFromDb(agentId),
      getAgentStatusFromDb(agentId),
      getPaymentSchedulesFromDb(agentId),
      getPaymentHistoryFromDb(agentId),
      getPaymentStatsFromDb(agentId),
    ]);
    const mockAgent = agents.find((a) => a.id === agentId);
    return NextResponse.json({
      agent: {
        ...(mockAgent ?? {}),
        id: meta.id,
        name: meta.name,
        description: meta.description ?? mockAgent?.description ?? "",
        chain: meta.chain ?? mockAgent?.chain ?? "Ethereum",
        protocol: meta.protocol ?? mockAgent?.protocol ?? "ERC-20 Transfers",
        walletAddress: meta.wallet_address ?? mockAgent?.walletAddress ?? "",
        status: liveStatus.status,
        uptime: liveStatus.uptime,
        lastActivity: liveStatus.lastActivity,
      },
      balanceHistory,
      events,
      schedules,
      payments,
      paymentStats,
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
    schedules: generatePaymentSchedules(),
    payments: generatePaymentHistory(),
    paymentStats: generatePaymentStats(),
  });
}
