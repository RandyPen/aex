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
              <th style={{ textAlign: "left", padding: "var(--space-md) var(--space-sm)", color: "var(--color-text-40)", fontWeight: "var(--font-weight-med)", fontSize: "var(--font-size-text-xs)" }}>Direction</th>
              <th style={{ textAlign: "right", padding: "var(--space-md) var(--space-sm)", color: "var(--color-text-40)", fontWeight: "var(--font-weight-med)", fontSize: "var(--font-size-text-xs)" }}>Trigger Price</th>
              <th style={{ textAlign: "right", padding: "var(--space-md) var(--space-sm)", color: "var(--color-text-40)", fontWeight: "var(--font-weight-med)", fontSize: "var(--font-size-text-xs)" }}>Amount Swapped</th>
              <th style={{ textAlign: "right", padding: "var(--space-md) var(--space-sm)", color: "var(--color-text-40)", fontWeight: "var(--font-weight-med)", fontSize: "var(--font-size-text-xs)" }}>USD Value</th>
              <th style={{ textAlign: "right", padding: "var(--space-md) var(--space-sm)", color: "var(--color-text-40)", fontWeight: "var(--font-weight-med)", fontSize: "var(--font-size-text-xs)" }}>Gas Cost</th>
              <th style={{ textAlign: "right", padding: "var(--space-md) var(--space-sm)", color: "var(--color-text-40)", fontWeight: "var(--font-weight-med)", fontSize: "var(--font-size-text-xs)" }}>Tx Hash</th>
            </tr>
          </thead>
          <tbody>
            {rebalances.map((rb, i) => (
              <tr key={i} style={{ borderBottom: "1px solid var(--color-border-20)" }}>
                <td style={{ padding: "var(--space-lg) var(--space-sm)", whiteSpace: "nowrap" }}>
                  <span className="mono" style={{ color: "var(--color-text-40)" }}>{formatTime(rb.ts)}</span>
                </td>
                <td style={{ padding: "var(--space-lg) var(--space-sm)" }}>
                  <span style={{
                    fontSize: "var(--font-size-text-xs)",
                    fontWeight: "var(--font-weight-semi)",
                    color: rb.direction === "BUY" ? "var(--color-green-50)" : "var(--color-coral-50)",
                    padding: "var(--space-xxs) var(--space-md)",
                    borderRadius: "var(--radi-xs)",
                    background: rb.direction === "BUY" ? "var(--color-green-5)" : "var(--color-coral-5)",
                  }}>
                    {rb.direction}
                  </span>
                </td>
                <td style={{ padding: "var(--space-lg) var(--space-sm)", textAlign: "right" }}>
                  <span className="mono" style={{ color: "var(--color-text-60)" }}>
                    ${rb.triggerPrice.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </span>
                </td>
                <td style={{ padding: "var(--space-lg) var(--space-sm)", textAlign: "right" }}>
                  <span className="mono" style={{ color: "var(--color-text-60)" }}>
                    {rb.amountSwapped.toFixed(4)} {rb.amountSwappedSymbol}
                  </span>
                </td>
                <td style={{ padding: "var(--space-lg) var(--space-sm)", textAlign: "right" }}>
                  <span className="mono" style={{ color: "var(--color-text-90)" }}>
                    ${rb.usdValue.toFixed(2)}
                  </span>
                </td>
                <td style={{ padding: "var(--space-lg) var(--space-sm)", textAlign: "right" }}>
                  <div className="mono" style={{ color: "var(--color-text-60)", fontSize: "var(--font-size-text-xs)" }}>
                    {rb.gasCostNative.toFixed(5)} {rb.gasCostSymbol}
                  </div>
                  <div className="mono" style={{ color: "var(--color-text-40)", fontSize: "var(--font-size-text-xs)" }}>
                    ${rb.gasCost.toFixed(2)}
                  </div>
                </td>
                <td style={{ padding: "var(--space-lg) var(--space-sm)", textAlign: "right" }}>
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
