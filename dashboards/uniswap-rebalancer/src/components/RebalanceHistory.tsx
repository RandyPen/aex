"use client";

import type { RebalanceEvent } from "@/lib/types";

interface RebalanceHistoryProps {
  rebalances: RebalanceEvent[];
}

function formatTime(ts: string): string {
  return new Date(ts).toLocaleString([], {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

const reasonLabels: Record<string, string> = {
  out_of_range_above: "Price above range",
  out_of_range_below: "Price below range",
  manual: "Manual trigger",
};

export function RebalanceHistory({ rebalances }: RebalanceHistoryProps) {
  if (!rebalances.length) {
    return (
      <div className="card">
        <div className="card-header">
          <span className="card-title">Rebalance History</span>
        </div>
        <p style={{ color: "var(--color-text-40)", fontSize: "var(--font-size-text-sm)" }}>No rebalances yet.</p>
      </div>
    );
  }

  return (
    <div className="card">
      <div className="card-header">
        <span className="card-title">Rebalance History</span>
        <span style={{ fontSize: "var(--font-size-text-xs)", color: "var(--color-text-40)" }}>
          {rebalances.length} rebalances
        </span>
      </div>
      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "var(--font-size-text-sm)" }}>
          <thead>
            <tr style={{ borderBottom: "1px solid var(--color-border-20)" }}>
              <th style={{ textAlign: "left", padding: "var(--space-md) var(--space-sm)", color: "var(--color-text-40)", fontWeight: "var(--font-weight-med)", fontSize: "var(--font-size-text-xs)" }}>Time</th>
              <th style={{ textAlign: "left", padding: "var(--space-md) var(--space-sm)", color: "var(--color-text-40)", fontWeight: "var(--font-weight-med)", fontSize: "var(--font-size-text-xs)" }}>Old Range</th>
              <th style={{ textAlign: "left", padding: "var(--space-md) var(--space-sm)", color: "var(--color-text-40)", fontWeight: "var(--font-weight-med)", fontSize: "var(--font-size-text-xs)" }}>New Range</th>
              <th style={{ textAlign: "left", padding: "var(--space-md) var(--space-sm)", color: "var(--color-text-40)", fontWeight: "var(--font-weight-med)", fontSize: "var(--font-size-text-xs)" }}>Trigger</th>
              <th style={{ textAlign: "right", padding: "var(--space-md) var(--space-sm)", color: "var(--color-text-40)", fontWeight: "var(--font-weight-med)", fontSize: "var(--font-size-text-xs)" }}>Gas</th>
              <th style={{ textAlign: "right", padding: "var(--space-md) var(--space-sm)", color: "var(--color-text-40)", fontWeight: "var(--font-weight-med)", fontSize: "var(--font-size-text-xs)" }}>Recovered</th>
            </tr>
          </thead>
          <tbody>
            {rebalances.map((rb, i) => (
              <tr key={i} style={{ borderBottom: "1px solid var(--color-border-20)" }}>
                <td style={{ padding: "var(--space-lg) var(--space-sm)", whiteSpace: "nowrap" }}>
                  <span className="mono" style={{ color: "var(--color-text-40)" }}>{formatTime(rb.ts)}</span>
                </td>
                <td style={{ padding: "var(--space-lg) var(--space-sm)" }}>
                  <span className="mono" style={{ color: "var(--color-text-60)", fontSize: "var(--font-size-text-xs)" }}>
                    [{rb.oldTickLower}, {rb.oldTickUpper}]
                  </span>
                </td>
                <td style={{ padding: "var(--space-lg) var(--space-sm)" }}>
                  <span className="mono" style={{ color: "var(--color-text-80)", fontSize: "var(--font-size-text-xs)" }}>
                    [{rb.newTickLower}, {rb.newTickUpper}]
                  </span>
                </td>
                <td style={{ padding: "var(--space-lg) var(--space-sm)" }}>
                  <span style={{
                    fontSize: "var(--font-size-text-xs)",
                    color: rb.triggerReason === "out_of_range_above"
                      ? "var(--color-coral-50)"
                      : rb.triggerReason === "out_of_range_below"
                        ? "var(--color-blue-50)"
                        : "var(--color-text-40)",
                  }}>
                    {reasonLabels[rb.triggerReason] ?? rb.triggerReason}
                  </span>
                </td>
                <td style={{ padding: "var(--space-lg) var(--space-sm)", textAlign: "right" }}>
                  <div className="mono" style={{ color: "var(--color-text-60)", fontSize: "var(--font-size-text-xs)" }}>
                    {rb.gasCostEth.toFixed(5)} ETH
                  </div>
                  <div className="mono" style={{ color: "var(--color-text-40)", fontSize: "var(--font-size-text-xs)" }}>
                    ${rb.gasCostUsd.toFixed(2)}
                  </div>
                </td>
                <td style={{ padding: "var(--space-lg) var(--space-sm)", textAlign: "right" }}>
                  <div className="mono" style={{ color: "var(--color-text-60)", fontSize: "var(--font-size-text-xs)" }}>
                    {rb.token0Recovered.toFixed(4)} ETH
                  </div>
                  <div className="mono" style={{ color: "var(--color-text-60)", fontSize: "var(--font-size-text-xs)" }}>
                    {rb.token1Recovered.toFixed(2)} USDC
                  </div>
                  {rb.txHash && (
                    <span className="mono" style={{ color: "var(--color-emerald-50)", fontSize: "var(--font-size-text-xs)" }}>
                      {rb.txHash.slice(0, 10)}...
                    </span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
