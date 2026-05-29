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
} from "@/lib/types";

// Shared components
import { BalanceChart } from "@/components/BalanceChart";
import { EventList } from "@/components/EventList";
import { AgentConfig } from "@/components/AgentConfig";
import { StatCard } from "@/components/StatCard";
import { AgentExplainer } from "@/components/AgentExplainer";

// Cetus CLMM yield components
import { PositionCard } from "@/components/PositionCard";
import { PerformanceCard } from "@/components/PerformanceCard";
import { VolatilityCard } from "@/components/VolatilityCard";
import { PoolComparison } from "@/components/PoolComparison";
import { CrossProtocol } from "@/components/CrossProtocol";

const CETUS_AGENT_IDS = new Set(["cetus-yield-agent", "sui-cetus-yield"]);

interface DashboardData {
  agent: Agent;
  balanceHistory: BalanceSnapshot[];
  events: AgentEvent[];
  position: PositionData | null;
  performance: PerformanceData | null;
  volatility: VolatilityData | null;
  yieldScan: YieldScanData | null;
}

interface AgentSummary {
  id: string;
  name: string;
  chain: string;
  protocol: string;
  category?: string;
  status: "running" | "stopped" | "unknown";
}

export default function AgentDashboard() {
  const params = useParams<{ agentId: string }>();
  const router = useRouter();
  const agentId = params.agentId;

  const [data, setData] = useState<DashboardData | null>(null);
  const [allAgents, setAllAgents] = useState<AgentSummary[]>([]);
  const [notFound, setNotFound] = useState(false);

  // Validate scope client-side so an invalid id renders 404 immediately.
  const isInScope = CETUS_AGENT_IDS.has(agentId);

  useEffect(() => {
    if (!isInScope) {
      setNotFound(true);
      return;
    }
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
  }, [agentId, isInScope]);

  if (notFound) {
    return (
      <div className="container" style={{ paddingTop: "var(--space-10xl)", textAlign: "center" }}>
        <h1 style={{ fontSize: "var(--font-size-h4)", marginBottom: "var(--space-lg)" }}>Agent not found</h1>
        <p style={{ color: "var(--color-text-40)", marginBottom: "var(--space-2xl)" }}>
          No Cetus agent registered with id <code className="mono">{agentId}</code>.
        </p>
        <Link href="/" style={{ color: "var(--color-text-90)" }}>← Back to Cetus agents</Link>
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
  const lastSnapshot = balanceHistory.length > 0 ? balanceHistory[balanceHistory.length - 1] : null;
  const currentBaseBalance = lastSnapshot?.balance ?? 0;
  const currentUsdcBalance = lastSnapshot?.usdcBalance ?? 0;
  const txCount = events.filter((e) => e.txHash).length;
  const pnlValue = data.performance?.pnl ?? 0;

  const showVolatility = data.volatility && data.volatility.volatilitySamples > 0;
  const showYieldScan = data.yieldScan && (data.yieldScan.cetusTopPools?.length ?? 0) > 0;

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
          ← Cetus Agents
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

  const walletLabel = `${currentBaseBalance.toFixed(2)} SUI + ${currentUsdcBalance.toFixed(2)} USDC`;

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

      {/* Quick stats */}
      <div className="grid grid-4" style={{ marginBottom: "var(--space-4xl)" }}>
        <StatCard label="Status" value={agent.status} indicator={agent.status} />
        <StatCard label="Wallet" value={walletLabel} />
        <StatCard
          label="Profit / Loss"
          value={`${pnlValue >= 0 ? "+" : ""}${pnlValue.toFixed(4)}`}
          color={pnlValue >= 0 ? "var(--color-green-50)" : "var(--color-red-60)"}
        />
        <StatCard label="Transactions" value={txCount.toString()} />
      </div>

      {/* Balance chart + activity */}
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

      {/* Cetus CLMM position + performance */}
      {(data.position || data.performance) && (
        <div className="grid grid-2" style={{ marginBottom: "var(--space-4xl)" }}>
          {data.position && <PositionCard position={data.position} />}
          {data.performance && <PerformanceCard performance={data.performance} />}
        </div>
      )}

      {/* Volatility */}
      {showVolatility && (
        <div style={{ marginBottom: "var(--space-4xl)" }}>
          <VolatilityCard volatility={data.volatility!} />
        </div>
      )}

      {/* Yield scan: top Cetus pools + cross-protocol comparison */}
      {showYieldScan && (
        <div className="grid grid-2" style={{ marginBottom: "var(--space-4xl)" }}>
          <PoolComparison yieldScan={data.yieldScan!} />
          <CrossProtocol yieldScan={data.yieldScan!} />
        </div>
      )}

      {/* Identity + Config */}
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
