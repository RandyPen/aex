"use client";

import type { Proposal } from "@/lib/types";

interface ProposalTrackerProps {
  proposals: Proposal[];
}

function timeRemaining(endTs: string): string {
  const ms = new Date(endTs).getTime() - Date.now();
  if (ms <= 0) return "ended";
  if (ms < 3_600_000) return `${Math.round(ms / 60_000)}m left`;
  if (ms < 86_400_000) return `${Math.round(ms / 3_600_000)}h left`;
  return `${Math.round(ms / 86_400_000)}d left`;
}

function formatVotes(v: number): string {
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000) return `${(v / 1_000).toFixed(0)}K`;
  return v.toString();
}

export function ProposalTracker({ proposals }: ProposalTrackerProps) {
  const activeProposals = proposals.filter((p) => p.status === "active");

  if (!activeProposals.length) {
    return (
      <div className="card">
        <div className="card-header">
          <span className="card-title">Active Proposals</span>
        </div>
        <p style={{ color: "var(--color-text-40)", fontSize: "var(--font-size-text-sm)" }}>No active proposals being tracked.</p>
      </div>
    );
  }

  return (
    <div className="card">
      <div className="card-header">
        <span className="card-title">Active Proposals</span>
        <span style={{ fontSize: "var(--font-size-text-xs)", color: "var(--color-text-40)" }}>
          {activeProposals.length} active
        </span>
      </div>

      {activeProposals.map((proposal, i) => {
        const totalVotes = proposal.forVotes + proposal.againstVotes + proposal.abstainVotes;
        const forPct = totalVotes > 0 ? (proposal.forVotes / totalVotes) * 100 : 0;
        const againstPct = totalVotes > 0 ? (proposal.againstVotes / totalVotes) * 100 : 0;
        const quorumPct = proposal.quorum > 0 ? (totalVotes / proposal.quorum) * 100 : 0;

        return (
          <div key={i} style={{
            padding: "var(--space-2xl) 0",
            borderBottom: i < activeProposals.length - 1 ? "1px solid var(--color-border-20)" : "none",
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "var(--space-md)" }}>
              <div style={{ flex: 1, marginRight: "var(--space-2xl)" }}>
                <div style={{ fontSize: "var(--font-size-text-sm)", color: "var(--color-text-80)", lineHeight: 1.4, marginBottom: "var(--space-xs)" }}>
                  {proposal.title}
                </div>
                <div style={{ display: "flex", gap: "var(--space-md)", alignItems: "center" }}>
                  <span className="tag tag-protocol">{proposal.spaceName}</span>
                  {proposal.agentVoted && proposal.agentChoice && (
                    <span style={{ fontSize: "var(--font-size-text-xs)", color: "var(--color-text-40)" }}>
                      Agent voted: <span className={`tag ${proposal.agentChoice === "For" ? "tag-for" : proposal.agentChoice === "Against" ? "tag-against" : "tag-abstain"}`}>{proposal.agentChoice}</span>
                    </span>
                  )}
                  {!proposal.agentVoted && (
                    <span style={{ fontSize: "var(--font-size-text-xs)", color: "var(--color-yellow-50)" }}>
                      Not yet voted
                    </span>
                  )}
                </div>
              </div>
              <div style={{ textAlign: "right", flexShrink: 0 }}>
                <div style={{
                  fontFamily: "var(--font-family-code), monospace",
                  fontSize: "var(--font-size-text-sm)",
                  fontWeight: "var(--font-weight-semi)",
                  color: "var(--color-text-80)",
                }}>
                  {timeRemaining(proposal.endTs)}
                </div>
              </div>
            </div>

            {/* Vote bar */}
            <div style={{ marginBottom: "var(--space-md)" }}>
              <div style={{
                display: "flex",
                height: "6px",
                borderRadius: "var(--radi-full)",
                overflow: "hidden",
                background: "var(--color-background-10)",
              }}>
                <div style={{ width: `${forPct}%`, background: "var(--color-green-50)" }} />
                <div style={{ width: `${againstPct}%`, background: "var(--color-red-60)" }} />
              </div>
            </div>

            <div style={{ display: "flex", gap: "var(--space-3xl)", fontSize: "var(--font-size-text-xs)" }}>
              <div>
                <span style={{ color: "var(--color-green-50)" }}>For: </span>
                <span className="mono" style={{ color: "var(--color-text-60)" }}>{formatVotes(proposal.forVotes)} ({forPct.toFixed(0)}%)</span>
              </div>
              <div>
                <span style={{ color: "var(--color-red-60)" }}>Against: </span>
                <span className="mono" style={{ color: "var(--color-text-60)" }}>{formatVotes(proposal.againstVotes)} ({againstPct.toFixed(0)}%)</span>
              </div>
              <div>
                <span style={{ color: "var(--color-text-40)" }}>Quorum: </span>
                <span className="mono" style={{ color: quorumPct >= 100 ? "var(--color-green-50)" : "var(--color-yellow-50)" }}>
                  {quorumPct.toFixed(0)}%
                </span>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
