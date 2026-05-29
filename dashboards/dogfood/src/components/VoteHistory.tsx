"use client";

import type { VoteEvent } from "@/lib/types";

interface VoteHistoryProps {
  votes: VoteEvent[];
}

function formatTime(ts: string): string {
  return new Date(ts).toLocaleString([], {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function choiceTagClass(choice: string): string {
  if (choice === "For") return "tag-for";
  if (choice === "Against") return "tag-against";
  return "tag-abstain";
}

function statusTagClass(status: string): string {
  if (status === "active") return "tag-active";
  if (status === "passed") return "tag-passed";
  if (status === "failed") return "tag-failed";
  return "tag-closed";
}

export function VoteHistory({ votes }: VoteHistoryProps) {
  if (!votes.length) {
    return (
      <div className="card">
        <div className="card-header">
          <span className="card-title">Vote History</span>
        </div>
        <p style={{ color: "var(--color-text-40)", fontSize: "var(--font-size-text-sm)" }}>No votes cast yet.</p>
      </div>
    );
  }

  return (
    <div className="card">
      <div className="card-header">
        <span className="card-title">Vote History</span>
        <span style={{ fontSize: "var(--font-size-text-xs)", color: "var(--color-text-40)" }}>
          {votes.length} votes
        </span>
      </div>
      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "var(--font-size-text-sm)" }}>
          <thead>
            <tr style={{ borderBottom: "1px solid var(--color-border-20)" }}>
              <th style={{ textAlign: "left", padding: "var(--space-md) var(--space-sm)", color: "var(--color-text-40)", fontWeight: "var(--font-weight-med)", fontSize: "var(--font-size-text-xs)" }}>Time</th>
              <th style={{ textAlign: "left", padding: "var(--space-md) var(--space-sm)", color: "var(--color-text-40)", fontWeight: "var(--font-weight-med)", fontSize: "var(--font-size-text-xs)" }}>Proposal</th>
              <th style={{ textAlign: "left", padding: "var(--space-md) var(--space-sm)", color: "var(--color-text-40)", fontWeight: "var(--font-weight-med)", fontSize: "var(--font-size-text-xs)" }}>Space</th>
              <th style={{ textAlign: "center", padding: "var(--space-md) var(--space-sm)", color: "var(--color-text-40)", fontWeight: "var(--font-weight-med)", fontSize: "var(--font-size-text-xs)" }}>Vote</th>
              <th style={{ textAlign: "right", padding: "var(--space-md) var(--space-sm)", color: "var(--color-text-40)", fontWeight: "var(--font-weight-med)", fontSize: "var(--font-size-text-xs)" }}>Power</th>
              <th style={{ textAlign: "center", padding: "var(--space-md) var(--space-sm)", color: "var(--color-text-40)", fontWeight: "var(--font-weight-med)", fontSize: "var(--font-size-text-xs)" }}>Status</th>
            </tr>
          </thead>
          <tbody>
            {votes.map((vote, i) => (
              <tr key={i} style={{ borderBottom: "1px solid var(--color-border-20)" }}>
                <td style={{ padding: "var(--space-lg) var(--space-sm)", whiteSpace: "nowrap" }}>
                  <span className="mono" style={{ color: "var(--color-text-40)" }}>{formatTime(vote.ts)}</span>
                </td>
                <td style={{ padding: "var(--space-lg) var(--space-sm)", maxWidth: "300px" }}>
                  <div style={{ color: "var(--color-text-80)", fontSize: "var(--font-size-text-sm)", lineHeight: 1.4 }}>
                    {vote.proposalTitle}
                  </div>
                  {vote.txHash && (
                    <span className="mono" style={{ color: "var(--color-emerald-50)", fontSize: "var(--font-size-text-xs)" }}>
                      {vote.txHash}
                    </span>
                  )}
                </td>
                <td style={{ padding: "var(--space-lg) var(--space-sm)" }}>
                  <span className="tag tag-protocol">{vote.spaceName}</span>
                </td>
                <td style={{ padding: "var(--space-lg) var(--space-sm)", textAlign: "center" }}>
                  <span className={`tag ${choiceTagClass(vote.choice)}`}>
                    {vote.choice}
                  </span>
                </td>
                <td style={{ padding: "var(--space-lg) var(--space-sm)", textAlign: "right", fontFamily: "var(--font-family-code), monospace" }}>
                  {vote.votingPower.toLocaleString()}
                </td>
                <td style={{ padding: "var(--space-lg) var(--space-sm)", textAlign: "center" }}>
                  <span className={`tag ${statusTagClass(vote.proposalStatus)}`}>
                    {vote.proposalStatus}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
