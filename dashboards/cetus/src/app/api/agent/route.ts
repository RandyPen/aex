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
  generatePerformance,
  generateVolatility,
  generateYieldScan,
  generateTrades,
  generatePMPositions,
  generatePnL,
  generateWatchedMarkets,
  generateAnalyses,
  generateLLMStats,
  generateArbOpportunities,
  generateOpenPositions,
  generateSpreadHistory,
  generateUniRebalanceHistory,
  generatePoolPosition,
  generateFeeData,
  generateDriftHistory,
  generateGridRebalanceHistory,
  generateAllocationState,
  generateThresholdState,
  generatePriceHistory,
  generateVoteHistory,
  generateProposals,
  generateVotingStats,
  generatePaymentSchedules,
  generatePaymentHistory,
  generatePaymentStats,
  generateTestRuns,
  generateTestStats,
  generateMonitoredRepos,
} from "@/lib/mock-data";
import { HAS_DB } from "@/lib/db";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function detectAgentType(agent: { name?: string; protocol?: string; category?: string }): string {
  const name = (agent.name || "").toLowerCase();
  const protocol = (agent.protocol || "").toLowerCase();
  const category = (agent.category || "").toLowerCase();

  if (category === "yield" && protocol.includes("cetus")) return "cetus-yield";
  if (category === "yield" && protocol.includes("morpho")) return "morpho-yield";
  if (category === "yield" && protocol.includes("uniswap")) return "uniswap-yield";
  if (category === "trading" && (name.includes("llm") || name.includes("analyst"))) return "polymarket-llm";
  if (category === "trading" && (name.includes("arbitrage") || name.includes("arb"))) return "polymarket-arb";
  if (category === "trading" && (name.includes("rebalancer") || name.includes("portfolio"))) return "portfolio-rebalancer";
  if (category === "trading" && protocol.includes("polymarket")) return "polymarket-signal";
  if (category === "governance") return "governance";
  if (category === "other" && (name.includes("payment") || name.includes("pay"))) return "payments";
  if (category === "other" && (name.includes("test") || name.includes("wallet"))) return "wallet-test";
  if (protocol.includes("cetus")) return "cetus-yield";
  if (protocol.includes("uniswap")) return "uniswap-yield";
  if (protocol.includes("polymarket") && name.includes("llm")) return "polymarket-llm";
  if (protocol.includes("polymarket") && name.includes("arb")) return "polymarket-arb";
  if (protocol.includes("polymarket")) return "polymarket-signal";
  if (protocol.includes("snapshot")) return "governance";
  if (name.includes("rebalancer") || name.includes("portfolio")) return "portfolio-rebalancer";
  if (name.includes("payment")) return "payments";
  if (name.includes("test") || name.includes("integration")) return "wallet-test";
  return "generic";
}

function getMockDataForType(agentType: string) {
  const base: Record<string, unknown> = {};

  switch (agentType) {
    case "cetus-yield":
      base.position = generatePosition();
      base.performance = generatePerformance();
      base.volatility = generateVolatility();
      base.yieldScan = generateYieldScan();
      break;
    case "morpho-yield":
      base.performance = generatePerformance();
      break;
    case "uniswap-yield":
      base.poolPosition = generatePoolPosition();
      base.feeData = generateFeeData();
      base.driftHistory = generateDriftHistory();
      base.uniRebalances = generateUniRebalanceHistory();
      base.performance = generatePerformance();
      break;
    case "polymarket-signal":
      base.trades = generateTrades();
      base.pmPositions = generatePMPositions();
      base.pnl = generatePnL();
      base.watchedMarkets = generateWatchedMarkets();
      break;
    case "polymarket-llm":
      base.trades = generateTrades();
      base.pmPositions = generatePMPositions();
      base.pnl = generatePnL();
      base.watchedMarkets = generateWatchedMarkets();
      base.analyses = generateAnalyses();
      base.llmStats = generateLLMStats();
      base.confidenceThreshold = 0.72;
      break;
    case "polymarket-arb":
      base.pnl = generatePnL();
      base.arbOpportunities = generateArbOpportunities();
      base.openArbPositions = generateOpenPositions();
      base.spreadHistory = generateSpreadHistory();
      break;
    case "portfolio-rebalancer":
      base.gridRebalances = generateGridRebalanceHistory();
      base.allocation = generateAllocationState();
      base.thresholdState = generateThresholdState();
      base.priceHistory = generatePriceHistory();
      break;
    case "governance":
      base.votes = generateVoteHistory();
      base.proposals = generateProposals();
      base.votingStats = generateVotingStats();
      break;
    case "payments":
      base.paymentSchedules = generatePaymentSchedules();
      base.paymentHistory = generatePaymentHistory();
      base.paymentStats = generatePaymentStats();
      break;
    case "wallet-test":
      base.testRuns = generateTestRuns();
      base.testStats = generateTestStats();
      base.monitoredRepos = generateMonitoredRepos();
      break;
  }

  return base;
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
    const agentType = detectAgentType({ name: meta.name, protocol: meta.protocol, category: meta.category });
    const typeData = getMockDataForType(agentType);

    return NextResponse.json({
      agent: {
        ...(mockAgent ?? {}),
        id: meta.id,
        name: meta.name,
        description: meta.description ?? mockAgent?.description ?? "",
        chain: meta.chain ?? mockAgent?.chain ?? "sui",
        protocol: meta.protocol ?? mockAgent?.protocol ?? "cetus",
        category: meta.category ?? mockAgent?.category ?? "",
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
      // DB data takes precedence; type-specific mock data fills gaps for demo
      ...typeData,
    });
  }

  // Fallback: log-file / mock path
  const agent = agents.find((a) => a.id === agentId);
  if (!agent) {
    return NextResponse.json({ error: "Agent not found" }, { status: 404 });
  }

  const agentType = detectAgentType(agent);
  const typeData = getMockDataForType(agentType);

  // Try log-based data first (works for Cetus), fallback to mock generators
  const balanceHistory = getBalanceHistory(agentId);
  const events = getAgentEvents(agentId);
  const liveStatus = getAgentStatus(agentId);
  const position = getPositionData(agentId);
  const performance = getPerformanceData(agentId);
  const volatility = getVolatilityData(agentId);
  const yieldScan = getYieldScanData(agentId);

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
    ...typeData,
  });
}
