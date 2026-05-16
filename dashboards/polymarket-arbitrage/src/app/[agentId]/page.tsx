"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import type { Agent, BalanceSnapshot, AgentEvent, PnLData, ArbOpportunity, OpenArbPosition, SpreadDataPoint } from "@/lib/types";
import { BalanceChart } from "@/components/BalanceChart";
import { EventList } from "@/components/EventList";
import { PnLCard } from "@/components/PnLCard";
import { StatCard } from "@/components/StatCard";
import { AgentConfig } from "@/components/AgentConfig";
import { ArbOpportunities } from "@/components/ArbOpportunities";
import { SpreadChart } from "@/components/SpreadChart";
import { ArbStats } from "@/components/ArbStats";
import { OpenPositions } from "@/components/OpenPositions";
import { LegTracker } from "@/components/LegTracker";

interface DashboardData {
  agent: Agent;
  balanceHistory: BalanceSnapshot[];
  events: AgentEvent[];
  pnl: PnLData;
  arbOpportunities: ArbOpportunity[];
  openPositions: OpenArbPosition[];
  spreadHistory: SpreadDataPoint[];
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
    const interval = setInterval(fetchAgentData, 15_000);
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

  const { agent, balanceHistory, events, pnl, arbOpportunities, openPositions, spreadHistory } = data;
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
        <p style={{ color: "var(--color-text-60)", fontSize: "var(--font-size-text-sm)", maxWidth: "720px", lineHeight: 1.55 }}>
          {agent.description}
        </p>
      </header>

      {/* 1. Arb stats summary */}
      <ArbStats opportunities={arbOpportunities} />

      {/* 2. Quick numbers */}
      <div className="grid grid-4" style={{ marginBottom: "var(--space-4xl)" }}>
        <StatCard label="Status" value={agent.status} indicator={agent.status} />
        <StatCard label="Balance" value={`$${currentBalance.toFixed(2)}`} />
        <StatCard
          label="Total PnL"
          value={`${pnl.totalPnl >= 0 ? "+" : ""}$${pnl.totalPnl.toFixed(2)}`}
          color={pnl.totalPnl >= 0 ? "var(--color-green-50)" : "var(--color-red-60)"}
        />
        <StatCard label="Win Rate" value={`${pnl.winRate.toFixed(1)}%`} />
      </div>

      {/* 3. Spread chart + activity feed */}
      <div className="grid grid-2" style={{ marginBottom: "var(--space-4xl)" }}>
        <div className="card">
          <div className="card-header">
            <span className="card-title">Spread History</span>
            <span style={{ fontSize: "var(--font-size-text-xs)", color: "var(--color-text-40)" }}>bps over time</span>
          </div>
          <SpreadChart data={spreadHistory} />
        </div>

        <div className="card">
          <div className="card-header">
            <span className="card-title">Recent Activity</span>
          </div>
          <EventList events={events} />
        </div>
      </div>

      {/* 4. Open positions */}
      <div style={{ marginBottom: "var(--space-4xl)" }}>
        <OpenPositions positions={openPositions} />
      </div>

      {/* 5. Balance + PnL */}
      <div className="grid grid-2" style={{ marginBottom: "var(--space-4xl)" }}>
        <div className="card">
          <div className="card-header">
            <span className="card-title">Balance Over Time</span>
            <span style={{ fontSize: "var(--font-size-text-xs)", color: "var(--color-text-40)" }}>USDC</span>
          </div>
          <BalanceChart data={balanceHistory} />
        </div>
        <PnLCard pnl={pnl} />
      </div>

      {/* 6. Arb opportunities table */}
      <div style={{ marginBottom: "var(--space-4xl)" }}>
        <ArbOpportunities opportunities={arbOpportunities} />
      </div>

      {/* 7. Leg tracker */}
      <div style={{ marginBottom: "var(--space-4xl)" }}>
        <LegTracker opportunities={arbOpportunities} />
      </div>

      {/* 8. Identity + config */}
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
