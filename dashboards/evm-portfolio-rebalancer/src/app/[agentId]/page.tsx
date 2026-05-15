"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import type {
  Agent,
  BalanceSnapshot,
  AgentEvent,
  RebalanceEvent,
  AllocationState,
  ThresholdState,
  PricePoint,
  PnLData,
} from "@/lib/types";
import { PriceChart } from "@/components/PriceChart";
import { RebalanceHistory } from "@/components/RebalanceHistory";
import { AllocationCard } from "@/components/AllocationCard";
import { ThresholdStatus } from "@/components/ThresholdStatus";
import { BalanceChart } from "@/components/BalanceChart";
import { EventList } from "@/components/EventList";
import { PnLCard } from "@/components/PnLCard";
import { StatCard } from "@/components/StatCard";
import { AgentConfig } from "@/components/AgentConfig";

interface DashboardData {
  agent: Agent;
  balanceHistory: BalanceSnapshot[];
  events: AgentEvent[];
  rebalances: RebalanceEvent[];
  allocation: AllocationState;
  threshold: ThresholdState;
  priceHistory: PricePoint[];
  pnl: PnLData;
}

interface AgentSummary {
  id: string;
  name: string;
  chain: string;
  protocol: string;
  status: "running" | "stopped" | "unknown";
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
        <Link href="/" style={{ color: "var(--color-text-90)" }}>Back to all agents</Link>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="container" style={{ textAlign: "center", paddingTop: "var(--space-10xl)" }}>
        <p style={{ color: "var(--color-text-40)" }}>Loading agent data...</p>
      </div>
    );
  }

  const { agent, balanceHistory, events, rebalances, allocation, threshold, priceHistory, pnl } = data;
  const lastSnapshot = balanceHistory.length > 0 ? balanceHistory[balanceHistory.length - 1] : null;
  const currentBalance = lastSnapshot?.balance ?? 0;

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
          Agent Exchange
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
        {agent.description && (
          <p style={{ color: "var(--color-text-60)", fontSize: "var(--font-size-text-sm)", lineHeight: 1.5, maxWidth: "720px" }}>
            {agent.description}
          </p>
        )}
      </header>

      {/* 1. Quick numbers */}
      <div className="grid grid-4" style={{ marginBottom: "var(--space-4xl)" }}>
        <StatCard label="Status" value={agent.status} indicator={agent.status} />
        <StatCard
          label="Portfolio Value"
          value={`$${currentBalance.toLocaleString(undefined, { minimumFractionDigits: 2 })}`}
        />
        <StatCard
          label="Total Rebalances"
          value={rebalances.length.toString()}
        />
        <StatCard
          label="Total P&L"
          value={`${pnl.totalPnl >= 0 ? "+" : ""}$${pnl.totalPnl.toFixed(2)}`}
          color={pnl.totalPnl >= 0 ? "var(--color-green-50)" : "var(--color-red-60)"}
        />
      </div>

      {/* 2. Threshold status + allocation */}
      <div className="grid grid-2" style={{ marginBottom: "var(--space-4xl)" }}>
        <ThresholdStatus threshold={threshold} />
        <AllocationCard allocation={allocation} />
      </div>

      {/* 3. Price chart */}
      <div className="card" style={{ marginBottom: "var(--space-4xl)" }}>
        <div className="card-header">
          <span className="card-title">{threshold.targetToken} Price Over Time</span>
          <span style={{ fontSize: "var(--font-size-text-xs)", color: "var(--color-text-40)" }}>
            Thresholds: ${threshold.lowThreshold.toLocaleString()} / ${threshold.highThreshold.toLocaleString()}
          </span>
        </div>
        <PriceChart
          data={priceHistory}
          highThreshold={threshold.highThreshold}
          lowThreshold={threshold.lowThreshold}
          tokenSymbol={threshold.targetToken}
        />
      </div>

      {/* 4. Balance over time + recent activity */}
      <div className="grid grid-2" style={{ marginBottom: "var(--space-4xl)" }}>
        <div className="card">
          <div className="card-header">
            <span className="card-title">Portfolio Value Over Time</span>
            <span style={{ fontSize: "var(--font-size-text-xs)", color: "var(--color-text-40)" }}>USD</span>
          </div>
          <BalanceChart data={balanceHistory} />
        </div>

        <div className="card">
          <div className="card-header">
            <span className="card-title">Recent Activity</span>
          </div>
          <EventList events={events} />
        </div>
      </div>

      {/* 5. Rebalance history */}
      <div style={{ marginBottom: "var(--space-4xl)" }}>
        <RebalanceHistory rebalances={rebalances} />
      </div>

      {/* 6. Performance + Identity */}
      <div className="grid grid-2" style={{ marginBottom: "var(--space-4xl)" }}>
        <PnLCard pnl={pnl} />

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
                  {agent.walletAddress.slice(0, 10)}...{agent.walletAddress.slice(-8)}
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
      </div>

      {/* 7. Agent config */}
      <div className="grid grid-2">
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
