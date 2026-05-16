"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

interface AgentSummary {
  id: string;
  name: string;
  description: string;
  chain: string;
  protocol: string;
  category: string;
  walletAddress: string;
  status: "running" | "stopped" | "unknown";
  lastEventTs: string | null;
  lastEventAgeMs: number | null;
}

function formatRelative(ms: number | null): string {
  if (ms === null) return "no events";
  if (ms < 60_000) return `${Math.round(ms / 1000)}s ago`;
  if (ms < 3_600_000) return `${Math.round(ms / 60_000)}m ago`;
  if (ms < 86_400_000) return `${Math.round(ms / 3_600_000)}h ago`;
  return `${Math.round(ms / 86_400_000)}d ago`;
}

export default function Landing() {
  const [agents, setAgents] = useState<AgentSummary[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch("/api/agents");
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = await res.json();
        setAgents(json.agents ?? []);
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e));
      }
    }
    load();
    const interval = setInterval(load, 30_000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="container" style={{ paddingTop: "var(--space-6xl)", paddingBottom: "var(--space-10xl)" }}>
      <header style={{ marginBottom: "var(--space-6xl)" }}>
        <h1 style={{ fontSize: "var(--font-size-h3)", fontWeight: "var(--font-weight-semi)", marginBottom: "var(--space-md)" }}>
          Agent Exchange
        </h1>
        <p style={{ color: "var(--color-text-40)", fontSize: "var(--font-size-text-md)", maxWidth: "640px", lineHeight: 1.55 }}>
          EVM portfolio rebalancer agents operated by Holonym Foundation.
          Each agent monitors an ETH/USDC portfolio on Base, rebalances when price crosses thresholds, and reports live performance here.
        </p>
      </header>

      {error && (
        <div className="card" style={{ marginBottom: "var(--space-4xl)", borderColor: "var(--color-red-60)" }}>
          <span style={{ color: "var(--color-red-60)" }}>Failed to load agents: {error}</span>
        </div>
      )}

      {!agents && !error && (
        <p style={{ color: "var(--color-text-40)" }}>Loading agents...</p>
      )}

      {agents && agents.length === 0 && (
        <div className="card">
          <p style={{ color: "var(--color-text-40)" }}>No agents registered yet.</p>
        </div>
      )}

      {agents && agents.length > 0 && (
        <div className="grid grid-2" style={{ gap: "var(--space-2xl)" }}>
          {agents.map((agent) => (
            <Link
              key={agent.id}
              href={`/${agent.id}`}
              style={{ textDecoration: "none", color: "inherit", display: "block" }}
            >
              <div
                className="card"
                style={{
                  cursor: "pointer",
                  transition: "border-color 120ms ease, transform 120ms ease",
                  height: "100%",
                  display: "flex",
                  flexDirection: "column",
                  gap: "var(--space-md)",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "var(--space-md)" }}>
                    <h2 style={{ fontSize: "var(--font-size-h6)", fontWeight: "var(--font-weight-semi)" }}>
                      {agent.name}
                    </h2>
                    <span className={`status-dot ${agent.status}`} />
                  </div>
                  <span style={{ fontSize: "var(--font-size-text-xs)", color: "var(--color-text-40)" }}>
                    {formatRelative(agent.lastEventAgeMs)}
                  </span>
                </div>

                <div style={{ display: "flex", gap: "var(--space-md)", alignItems: "center" }}>
                  <span className="mono" style={{ fontSize: "var(--font-size-text-xs)", color: "var(--color-text-40)" }}>
                    {agent.id}
                  </span>
                  {agent.chain && <span className="tag tag-chain">{agent.chain}</span>}
                  {agent.protocol && <span className="tag tag-protocol">{agent.protocol}</span>}
                  {agent.category && <span className="tag tag-protocol">{agent.category}</span>}
                </div>

                {agent.description && (
                  <p style={{ color: "var(--color-text-60)", fontSize: "var(--font-size-text-sm)", lineHeight: 1.5 }}>
                    {agent.description}
                  </p>
                )}

                <div style={{ marginTop: "auto", paddingTop: "var(--space-md)", borderTop: "1px solid var(--color-border-20)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span className="mono" style={{ fontSize: "var(--font-size-text-xs)", color: "var(--color-text-40)" }}>
                    {agent.walletAddress
                      ? `${agent.walletAddress.slice(0, 8)}...${agent.walletAddress.slice(-6)}`
                      : "no wallet"}
                  </span>
                  <span style={{ fontSize: "var(--font-size-text-sm)", color: "var(--color-text-90)" }}>
                    Open dashboard
                  </span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
