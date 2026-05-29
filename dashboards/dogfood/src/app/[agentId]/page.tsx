"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import type {
  Agent,
  BalanceSnapshot,
  AgentEvent,
  PositionData,
  PerformanceData,
  VolatilityData,
  YieldScanData,
  TradeEvent,
  PMPositionData,
  PnLData,
  MarketData,
  AnalysisEvent,
  LLMStatsData,
  ArbOpportunity,
  OpenArbPosition,
  SpreadDataPoint,
  UniRebalanceEvent,
  PoolPosition,
  FeeData,
  DriftPoint,
  GridRebalanceEvent,
  AllocationState,
  ThresholdState,
  PricePoint,
  VoteEvent,
  Proposal,
  VotingStats,
  PaymentScheduleItem,
  PaymentEvent,
  PaymentStats,
  TestRun,
  TestStats,
  MonitoredRepo,
} from "@/lib/types";

// Shared components (rendered for all agents)
import { BalanceChart } from "@/components/BalanceChart";
import { EventList } from "@/components/EventList";
import { AgentConfig } from "@/components/AgentConfig";
import { StatCard } from "@/components/StatCard";
import { AgentExplainer } from "@/components/AgentExplainer";

// Cetus / yield components
import { PositionCard } from "@/components/PositionCard";
import { PerformanceCard } from "@/components/PerformanceCard";
import { VolatilityCard } from "@/components/VolatilityCard";
import { PoolComparison } from "@/components/PoolComparison";
import { CrossProtocol } from "@/components/CrossProtocol";

// Polymarket trading components
import { TradeHistory } from "@/components/TradeHistory";
import { ActivePositions } from "@/components/ActivePositions";
import { PnLCard } from "@/components/PnLCard";
import { MarketScanner } from "@/components/MarketScanner";

// LLM analyst components
import { AnalysisHistory } from "@/components/AnalysisHistory";
import { ConfidenceChart } from "@/components/ConfidenceChart";
import { LLMStats } from "@/components/LLMStats";

// Arbitrage components
import { ArbOpportunities } from "@/components/ArbOpportunities";
import { SpreadChart } from "@/components/SpreadChart";
import { ArbStats } from "@/components/ArbStats";
import { OpenPositions } from "@/components/OpenPositions";
import { LegTracker } from "@/components/LegTracker";

// Uniswap rebalancer components
import { PoolStatus } from "@/components/PoolStatus";
import { UniRebalanceHistory } from "@/components/UniRebalanceHistory";
import { PortfolioBalance } from "@/components/PortfolioBalance";
import { FeeEarnings } from "@/components/FeeEarnings";
import { DriftChart } from "@/components/DriftChart";

// EVM / Sui portfolio rebalancer components
import { PriceChart } from "@/components/PriceChart";
import { AllocationCard } from "@/components/AllocationCard";
import { ThresholdStatus } from "@/components/ThresholdStatus";
import { GridRebalanceHistory } from "@/components/GridRebalanceHistory";

// Snapshot governance components
import { VoteHistory } from "@/components/VoteHistory";
import { ProposalTracker } from "@/components/ProposalTracker";
import { VotingStatsCard } from "@/components/VotingStatsCard";
import { StrategyConfig } from "@/components/StrategyConfig";

// Recurring payments components
import { PaymentSchedule } from "@/components/PaymentSchedule";
import { PaymentHistory } from "@/components/PaymentHistory";
import { PaymentStatsCard } from "@/components/PaymentStatsCard";
import { UpcomingPayments } from "@/components/UpcomingPayments";

// Wallet integration test components
import { TestRunHistory } from "@/components/TestRunHistory";
import { TestStatsCard } from "@/components/TestStats";
import { RepoMonitor } from "@/components/RepoMonitor";
import { FailureLog } from "@/components/FailureLog";

/* ── Extended dashboard data covering all agent types ── */

interface DashboardData {
  agent: Agent;
  balanceHistory: BalanceSnapshot[];
  events: AgentEvent[];
  // Cetus/yield
  position: PositionData | null;
  performance: PerformanceData | null;
  volatility: VolatilityData | null;
  yieldScan: YieldScanData | null;
  // Polymarket trading
  trades?: TradeEvent[];
  pmPositions?: PMPositionData[];
  pnl?: PnLData | null;
  watchedMarkets?: MarketData[];
  // LLM analyst
  analyses?: AnalysisEvent[];
  llmStats?: LLMStatsData | null;
  confidenceThreshold?: number;
  // Arbitrage
  arbOpportunities?: ArbOpportunity[];
  openArbPositions?: OpenArbPosition[];
  spreadHistory?: SpreadDataPoint[];
  // Uniswap rebalancer
  uniRebalances?: UniRebalanceEvent[];
  poolPosition?: PoolPosition | null;
  feeData?: FeeData | null;
  driftHistory?: DriftPoint[];
  // EVM/Sui portfolio rebalancer
  gridRebalances?: GridRebalanceEvent[];
  allocation?: AllocationState | null;
  thresholdState?: ThresholdState | null;
  priceHistory?: PricePoint[];
  // Snapshot governance
  votes?: VoteEvent[];
  proposals?: Proposal[];
  votingStats?: VotingStats | null;
  // Recurring payments
  paymentSchedules?: PaymentScheduleItem[];
  paymentHistory?: PaymentEvent[];
  paymentStats?: PaymentStats | null;
  // Wallet integration test
  testRuns?: TestRun[];
  testStats?: TestStats | null;
  monitoredRepos?: MonitoredRepo[];
}

interface AgentSummary {
  id: string;
  name: string;
  chain: string;
  protocol: string;
  category?: string;
  status: "running" | "stopped" | "unknown";
}

/* ── Agent type detection ── */

type AgentType =
  | "cetus-yield"
  | "morpho-yield"
  | "uniswap-yield"
  | "polymarket-signal"
  | "polymarket-llm"
  | "polymarket-arb"
  | "portfolio-rebalancer"
  | "governance"
  | "payments"
  | "wallet-test"
  | "generic";

function detectAgentType(agent: Agent): AgentType {
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
  if (category === "other" && (name.includes("test") || name.includes("wallet") || name.includes("integration"))) return "wallet-test";

  // Fallback detection by protocol/name if category is missing
  if (protocol.includes("cetus")) return "cetus-yield";
  if (protocol.includes("uniswap")) return "uniswap-yield";
  if (protocol.includes("polymarket") && (name.includes("llm") || name.includes("analyst"))) return "polymarket-llm";
  if (protocol.includes("polymarket") && (name.includes("arb"))) return "polymarket-arb";
  if (protocol.includes("polymarket")) return "polymarket-signal";
  if (protocol.includes("snapshot")) return "governance";
  if (name.includes("rebalancer") || name.includes("portfolio")) return "portfolio-rebalancer";
  if (name.includes("payment") || name.includes("pay")) return "payments";
  if (name.includes("test") || name.includes("integration")) return "wallet-test";

  return "generic";
}

export default function AgentDashboard() {
  const params = useParams<{ agentId: string }>();
  const router = useRouter();
  const agentId = params.agentId;

  const [data, setData] = useState<DashboardData | null>(null);
  const [allAgents, setAllAgents] = useState<AgentSummary[]>([]);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    async function fetchAgentData() {
      try {
        const res = await fetch(`/api/agent?id=${agentId}`);
        if (res.status === 404) {
          setNotFound(true);
          return;
        }
        if (res.ok) {
          const json = await res.json();
          setData(json);
          setNotFound(false);
        }
      } catch (e) {
        console.error("[dashboard] fetch failed", e);
      }
    }
    async function fetchAgents() {
      try {
        const res = await fetch("/api/agents");
        if (res.ok) {
          const json = await res.json();
          setAllAgents(json.agents ?? []);
        }
      } catch {}
    }
    fetchAgentData();
    fetchAgents();
    const interval = setInterval(fetchAgentData, 30_000);
    return () => clearInterval(interval);
  }, [agentId]);

  if (notFound) {
    return (
      <div className="container" style={{ paddingTop: "var(--space-10xl)", textAlign: "center" }}>
        <h1 style={{ fontSize: "var(--font-size-h4)", marginBottom: "var(--space-lg)" }}>Agent not found</h1>
        <p style={{ color: "var(--color-text-40)", marginBottom: "var(--space-2xl)" }}>
          No agent registered with id <code className="mono">{agentId}</code>.
        </p>
        <Link href="/" style={{ color: "var(--color-text-90)" }}>← Back to all agents</Link>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="container" style={{ textAlign: "center", paddingTop: "var(--space-10xl)" }}>
        <p style={{ color: "var(--color-text-40)" }}>Loading agent data…</p>
      </div>
    );
  }

  const { agent, balanceHistory, events } = data;
  const agentType = detectAgentType(agent);
  const lastSnapshot = balanceHistory.length > 0 ? balanceHistory[balanceHistory.length - 1] : null;
  const currentBaseBalance = lastSnapshot?.balance ?? 0;
  const currentUsdcBalance = lastSnapshot?.usdcBalance ?? 0;
  const txCount = events.filter((e) => e.txHash).length;
  const pnlValue = data.performance?.pnl ?? data.pnl?.totalPnl ?? 0;

  const isCetus = agentType === "cetus-yield";
  const showVolatility = isCetus && data.volatility && data.volatility.volatilitySamples > 0;
  const showCetusYield = isCetus && data.yieldScan && (data.yieldScan.cetusTopPools?.length ?? 0) > 0;

  function getAgentHealthStatus(): { status: "earning" | "rebalancing" | "out_of_range" | "stopped"; drift?: number; threshold?: number } {
    if (agent.status === "stopped") return { status: "stopped" };
    for (const e of events) {
      if (e.message === "rebalance_start") return { status: "rebalancing" };
      if (e.message === "out_of_range") return { status: "out_of_range" };
      if (e.message === "drift_detected" || e.message === "sim_drift_detected") {
        return { status: "rebalancing", drift: e.data?.drift as number, threshold: e.data?.threshold as number };
      }
      if (typeof e.message === "string" && e.message.toLowerCase().includes("position in range")) {
        return { status: "earning", drift: e.data?.drift as number, threshold: e.data?.threshold as number };
      }
      if (e.message === "rebalance_complete" || e.message === "sim_rebalance" || e.message === "vault_deposit") {
        return { status: "earning" };
      }
    }
    return { status: agent.status === "running" ? "earning" : "stopped" };
  }

  const healthStatus = getAgentHealthStatus();

  function AgentNavInline() {
    if (allAgents.length === 0) return null;
    return (
      <nav style={{
        display: "flex",
        alignItems: "center",
        gap: "var(--space-xs)",
        marginBottom: "var(--space-4xl)",
        paddingBottom: "var(--space-2xl)",
        borderBottom: "1px solid var(--color-border-20)",
        flexWrap: "wrap",
      }}>
        <Link href="/" style={{
          fontSize: "var(--font-size-text-sm)",
          fontWeight: "var(--font-weight-semi)",
          color: "var(--color-text-90)",
          marginRight: "var(--space-2xl)",
          textDecoration: "none",
        }}>
          ← Agent Exchange
        </Link>
        {allAgents.map((a) => (
          <button
            key={a.id}
            onClick={() => router.push(`/${a.id}`)}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "var(--space-sm)",
              padding: "var(--space-sm) var(--space-xl)",
              borderRadius: "var(--radi-md)",
              border: a.id === agentId ? "1px solid var(--color-border-30)" : "1px solid transparent",
              background: a.id === agentId ? "var(--color-background-5)" : "transparent",
              color: a.id === agentId ? "var(--color-text-90)" : "var(--color-text-40)",
              fontSize: "var(--font-size-text-sm)",
              cursor: "pointer",
            }}
          >
            <span className={`status-dot ${a.status}`} />
            {a.name}
          </button>
        ))}
      </nav>
    );
  }

  /* ── Wallet label varies by agent type ── */
  function walletLabel(): string {
    if (isCetus) return `${currentBaseBalance.toFixed(2)} SUI + ${currentUsdcBalance.toFixed(2)} USDC`;
    if (agentType === "polymarket-signal" || agentType === "polymarket-llm" || agentType === "polymarket-arb") return `$${currentBaseBalance.toFixed(2)} USDC`;
    if (agentType === "portfolio-rebalancer") return `$${currentBaseBalance.toFixed(2)}`;
    if (agentType === "uniswap-yield") return `$${currentBaseBalance.toFixed(2)}`;
    return `${currentBaseBalance.toFixed(2)}`;
  }

  return (
    <div className="container">
      <AgentNavInline />

      <header style={{ marginBottom: "var(--space-5xl)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "var(--space-lg)", marginBottom: "var(--space-sm)" }}>
          <h1 style={{ fontSize: "var(--font-size-h5)", fontWeight: "var(--font-weight-semi)" }}>
            {agent.name}
          </h1>
          <span className={`status-dot ${agent.status}`} />
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "var(--space-md)", marginBottom: "var(--space-lg)", flexWrap: "wrap" }}>
          <span className="mono" style={{ color: "var(--color-text-40)" }}>{agent.id}</span>
          {agent.chain && <span className="tag tag-chain">{agent.chain}</span>}
          {agent.protocol && <span className="tag tag-protocol">{agent.protocol}</span>}
        </div>
      </header>

      <AgentExplainer
        agent={agent}
        currentStatus={healthStatus.status}
        drift={healthStatus.drift}
        threshold={healthStatus.threshold}
      />

      {/* Quick stats — all agents */}
      <div className="grid grid-4" style={{ marginBottom: "var(--space-4xl)" }}>
        <StatCard label="Status" value={agent.status} indicator={agent.status} />
        <StatCard label="Wallet" value={walletLabel()} />
        <StatCard
          label="Profit / Loss"
          value={`${pnlValue >= 0 ? "+" : ""}${pnlValue.toFixed(4)}`}
          color={pnlValue >= 0 ? "var(--color-green-50)" : "var(--color-red-60)"}
        />
        <StatCard label="Transactions" value={txCount.toString()} />
      </div>

      {/* Balance chart + activity — all agents */}
      <div className="grid grid-2" style={{ marginBottom: "var(--space-4xl)" }}>
        <div className="card">
          <div className="card-header">
            <span className="card-title">Balance Over Time</span>
            <span style={{ fontSize: "var(--font-size-text-xs)", color: "var(--color-text-40)" }}>Live</span>
          </div>
          <BalanceChart data={balanceHistory} events={events} />
        </div>
        <div className="card">
          <div className="card-header">
            <span className="card-title">Recent Activity</span>
          </div>
          <EventList events={events} />
        </div>
      </div>

      {/* ═══ Type-specific sections ═══ */}

      {/* ── Cetus yield ── */}
      {agentType === "cetus-yield" && (
        <>
          {(data.position || data.performance) && (
            <div className="grid grid-2" style={{ marginBottom: "var(--space-4xl)" }}>
              {data.position && <PositionCard position={data.position} />}
              {data.performance && <PerformanceCard performance={data.performance} />}
            </div>
          )}
          {showVolatility && (
            <div style={{ marginBottom: "var(--space-4xl)" }}>
              <VolatilityCard volatility={data.volatility!} />
            </div>
          )}
          {showCetusYield && (
            <div className="grid grid-2" style={{ marginBottom: "var(--space-4xl)" }}>
              <PoolComparison yieldScan={data.yieldScan!} />
              <CrossProtocol yieldScan={data.yieldScan!} />
            </div>
          )}
        </>
      )}

      {/* ── Morpho yield (same shape as Cetus minus yield-scan) ── */}
      {agentType === "morpho-yield" && data.performance && (
        <div className="grid grid-2" style={{ marginBottom: "var(--space-4xl)" }}>
          <PerformanceCard performance={data.performance} />
        </div>
      )}

      {/* ── Uniswap v3 yield ── */}
      {agentType === "uniswap-yield" && (
        <>
          {data.poolPosition && (
            <div className="grid grid-2" style={{ marginBottom: "var(--space-4xl)" }}>
              <PoolStatus position={data.poolPosition} />
              {data.feeData && <FeeEarnings fees={data.feeData} token0Symbol={data.poolPosition.token0Symbol} token1Symbol={data.poolPosition.token1Symbol} />}
            </div>
          )}
          {data.poolPosition && (
            <div style={{ marginBottom: "var(--space-4xl)" }}>
              <PortfolioBalance position={data.poolPosition} />
            </div>
          )}
          {data.driftHistory && data.driftHistory.length > 0 && (
            <div className="card" style={{ marginBottom: "var(--space-4xl)" }}>
              <div className="card-header">
                <span className="card-title">Price Drift</span>
              </div>
              <DriftChart data={data.driftHistory} />
            </div>
          )}
          {data.uniRebalances && data.uniRebalances.length > 0 && (
            <div style={{ marginBottom: "var(--space-4xl)" }}>
              <UniRebalanceHistory rebalances={data.uniRebalances} />
            </div>
          )}
        </>
      )}

      {/* ── Polymarket signal trading ── */}
      {agentType === "polymarket-signal" && (
        <>
          {data.pnl && (
            <div className="grid grid-2" style={{ marginBottom: "var(--space-4xl)" }}>
              <PnLCard pnl={data.pnl} />
              {data.pmPositions && <ActivePositions positions={data.pmPositions} />}
            </div>
          )}
          {data.trades && data.trades.length > 0 && (
            <div style={{ marginBottom: "var(--space-4xl)" }}>
              <TradeHistory trades={data.trades} />
            </div>
          )}
          {data.watchedMarkets && data.watchedMarkets.length > 0 && (
            <div style={{ marginBottom: "var(--space-4xl)" }}>
              <MarketScanner markets={data.watchedMarkets} />
            </div>
          )}
        </>
      )}

      {/* ── Polymarket LLM analyst ── */}
      {agentType === "polymarket-llm" && (
        <>
          {data.llmStats && (
            <div className="grid grid-2" style={{ marginBottom: "var(--space-4xl)" }}>
              <LLMStats stats={data.llmStats} />
              {data.pnl && <PnLCard pnl={data.pnl} />}
            </div>
          )}
          {data.analyses && data.analyses.length > 0 && (
            <>
              <div className="card" style={{ marginBottom: "var(--space-4xl)" }}>
                <div className="card-header">
                  <span className="card-title">Confidence Distribution</span>
                </div>
                <ConfidenceChart analyses={data.analyses} confidenceThreshold={data.confidenceThreshold ?? 0.72} />
              </div>
              <div style={{ marginBottom: "var(--space-4xl)" }}>
                <AnalysisHistory analyses={data.analyses} confidenceThreshold={data.confidenceThreshold ?? 0.72} />
              </div>
            </>
          )}
          {data.pmPositions && data.pmPositions.length > 0 && (
            <div style={{ marginBottom: "var(--space-4xl)" }}>
              <ActivePositions positions={data.pmPositions} />
            </div>
          )}
          {data.watchedMarkets && data.watchedMarkets.length > 0 && (
            <div style={{ marginBottom: "var(--space-4xl)" }}>
              <MarketScanner markets={data.watchedMarkets} />
            </div>
          )}
        </>
      )}

      {/* ── Polymarket arbitrage ── */}
      {agentType === "polymarket-arb" && (
        <>
          {data.arbOpportunities && <ArbStats opportunities={data.arbOpportunities} />}
          {data.spreadHistory && data.spreadHistory.length > 0 && (
            <div className="card" style={{ marginBottom: "var(--space-4xl)" }}>
              <div className="card-header">
                <span className="card-title">Spread History</span>
              </div>
              <SpreadChart data={data.spreadHistory} />
            </div>
          )}
          {data.openArbPositions && data.openArbPositions.length > 0 && (
            <div style={{ marginBottom: "var(--space-4xl)" }}>
              <OpenPositions positions={data.openArbPositions} />
            </div>
          )}
          {data.arbOpportunities && data.arbOpportunities.length > 0 && (
            <div style={{ marginBottom: "var(--space-4xl)" }}>
              <ArbOpportunities opportunities={data.arbOpportunities} />
            </div>
          )}
          {data.arbOpportunities && data.arbOpportunities.length > 0 && (
            <div style={{ marginBottom: "var(--space-4xl)" }}>
              <LegTracker opportunities={data.arbOpportunities} />
            </div>
          )}
        </>
      )}

      {/* ── Portfolio rebalancer (EVM / Sui) ── */}
      {agentType === "portfolio-rebalancer" && (
        <>
          {data.thresholdState && data.allocation && (
            <div className="grid grid-2" style={{ marginBottom: "var(--space-4xl)" }}>
              <ThresholdStatus threshold={data.thresholdState} />
              <AllocationCard allocation={data.allocation} />
            </div>
          )}
          {data.priceHistory && data.priceHistory.length > 0 && data.thresholdState && (
            <div className="card" style={{ marginBottom: "var(--space-4xl)" }}>
              <div className="card-header">
                <span className="card-title">Price History</span>
              </div>
              <PriceChart
                data={data.priceHistory}
                highThreshold={data.thresholdState.highThreshold}
                lowThreshold={data.thresholdState.lowThreshold}
                tokenSymbol={data.thresholdState.targetToken}
              />
            </div>
          )}
          {data.gridRebalances && data.gridRebalances.length > 0 && (
            <div style={{ marginBottom: "var(--space-4xl)" }}>
              <GridRebalanceHistory rebalances={data.gridRebalances} />
            </div>
          )}
        </>
      )}

      {/* ── Snapshot governance ── */}
      {agentType === "governance" && (
        <>
          {data.votingStats && (
            <div className="grid grid-2" style={{ marginBottom: "var(--space-4xl)" }}>
              <VotingStatsCard stats={data.votingStats} />
              <StrategyConfig agent={agent} />
            </div>
          )}
          {data.proposals && data.proposals.length > 0 && (
            <div style={{ marginBottom: "var(--space-4xl)" }}>
              <ProposalTracker proposals={data.proposals} />
            </div>
          )}
          {data.votes && data.votes.length > 0 && (
            <div style={{ marginBottom: "var(--space-4xl)" }}>
              <VoteHistory votes={data.votes} />
            </div>
          )}
        </>
      )}

      {/* ── Recurring payments ── */}
      {agentType === "payments" && (
        <>
          {data.paymentStats && (
            <div className="grid grid-2" style={{ marginBottom: "var(--space-4xl)" }}>
              <PaymentStatsCard stats={data.paymentStats} />
              {data.paymentSchedules && <UpcomingPayments schedules={data.paymentSchedules} />}
            </div>
          )}
          {data.paymentSchedules && data.paymentSchedules.length > 0 && (
            <div style={{ marginBottom: "var(--space-4xl)" }}>
              <PaymentSchedule schedules={data.paymentSchedules} />
            </div>
          )}
          {data.paymentHistory && data.paymentHistory.length > 0 && (
            <div style={{ marginBottom: "var(--space-4xl)" }}>
              <PaymentHistory payments={data.paymentHistory} />
            </div>
          )}
        </>
      )}

      {/* ── Wallet integration test ── */}
      {agentType === "wallet-test" && (
        <>
          {data.testStats && (
            <div style={{ marginBottom: "var(--space-4xl)" }}>
              <TestStatsCard stats={data.testStats} />
            </div>
          )}
          {data.monitoredRepos && data.monitoredRepos.length > 0 && (
            <div style={{ marginBottom: "var(--space-4xl)" }}>
              <RepoMonitor repos={data.monitoredRepos} />
            </div>
          )}
          {data.testRuns && data.testRuns.length > 0 && (
            <div style={{ marginBottom: "var(--space-4xl)" }}>
              <TestRunHistory runs={data.testRuns} />
            </div>
          )}
          {data.testRuns && data.testRuns.length > 0 && (
            <div style={{ marginBottom: "var(--space-4xl)" }}>
              <FailureLog runs={data.testRuns} />
            </div>
          )}
        </>
      )}

      {/* Identity + Config — all agents */}
      <div className="grid grid-2">
        <div className="card">
          <div className="card-header">
            <span className="card-title">Identity</span>
          </div>
          <div>
            <div className="config-row">
              <span className="config-key">Agent ID</span>
              <span className="config-value">{agent.id}</span>
            </div>
            {agent.walletAddress && (
              <div className="config-row">
                <span className="config-key">Wallet</span>
                <span className="config-value" style={{ fontSize: "var(--font-size-text-xs)" }}>
                  {agent.walletAddress.slice(0, 10)}…{agent.walletAddress.slice(-8)}
                </span>
              </div>
            )}
            {agent.network && (
              <div className="config-row">
                <span className="config-key">Network</span>
                <span className="config-value">{agent.network}</span>
              </div>
            )}
            <div className="config-row">
              <span className="config-key">Uptime</span>
              <span className="config-value">{agent.uptime}</span>
            </div>
            <div className="config-row">
              <span className="config-key">Last Activity</span>
              <span className="config-value">{agent.lastActivity}</span>
            </div>
            {agent.tools && agent.tools.length > 0 && (
              <div style={{ marginTop: "var(--space-2xl)" }}>
                <span className="card-title">Developer Tools</span>
                <div style={{ marginTop: "var(--space-md)", display: "flex", flexWrap: "wrap", gap: "var(--space-md)" }}>
                  {agent.tools.map((tool) => (
                    <span key={tool} className="tag tag-protocol">{tool}</span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="card">
          <div className="card-header">
            <span className="card-title">Agent Configuration</span>
          </div>
          <AgentConfig agent={agent} />
        </div>
      </div>
    </div>
  );
}
