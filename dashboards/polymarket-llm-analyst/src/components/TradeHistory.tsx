"use client";

import type { TradeEvent } from "@/lib/types";

interface TradeHistoryProps {
  trades: TradeEvent[];
}

function formatTime(ts: string): string {
  return new Date(ts).toLocaleString([], {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function TradeHistory({ trades }: TradeHistoryProps) {
  if (!trades.length) {
    return (
      <div className="card">
        <div className="card-header">
          <span className="card-title">Trade History</span>
        </div>
        <p style={{ color: "var(--color-text-40)", fontSize: "var(--font-size-text-sm)" }}>No trades yet.</p>
      </div>
    );
  }

  return (
    <div className="card">
      <div className="card-header">
        <span className="card-title">Trade History</span>
        <span style={{ fontSize: "var(--font-size-text-xs)", color: "var(--color-text-40)" }}>
          {trades.length} trades
        </span>
      </div>
      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "var(--font-size-text-sm)" }}>
          <thead>
            <tr style={{ borderBottom: "1px solid var(--color-border-20)" }}>
              <th style={{ textAlign: "left", padding: "var(--space-md) var(--space-sm)", color: "var(--color-text-40)", fontWeight: "var(--font-weight-med)", fontSize: "var(--font-size-text-xs)" }}>Time</th>
              <th style={{ textAlign: "left", padding: "var(--space-md) var(--space-sm)", color: "var(--color-text-40)", fontWeight: "var(--font-weight-med)", fontSize: "var(--font-size-text-xs)" }}>Market</th>
              <th style={{ textAlign: "center", padding: "var(--space-md) var(--space-sm)", color: "var(--color-text-40)", fontWeight: "var(--font-weight-med)", fontSize: "var(--font-size-text-xs)" }}>Side</th>
              <th style={{ textAlign: "right", padding: "var(--space-md) var(--space-sm)", color: "var(--color-text-40)", fontWeight: "var(--font-weight-med)", fontSize: "var(--font-size-text-xs)" }}>Amount</th>
              <th style={{ textAlign: "right", padding: "var(--space-md) var(--space-sm)", color: "var(--color-text-40)", fontWeight: "var(--font-weight-med)", fontSize: "var(--font-size-text-xs)" }}>Price</th>
              <th style={{ textAlign: "center", padding: "var(--space-md) var(--space-sm)", color: "var(--color-text-40)", fontWeight: "var(--font-weight-med)", fontSize: "var(--font-size-text-xs)" }}>Status</th>
            </tr>
          </thead>
          <tbody>
            {trades.map((trade, i) => (
              <tr key={i} style={{ borderBottom: "1px solid var(--color-border-20)" }}>
                <td style={{ padding: "var(--space-lg) var(--space-sm)", whiteSpace: "nowrap" }}>
                  <span className="mono" style={{ color: "var(--color-text-40)" }}>{formatTime(trade.ts)}</span>
                </td>
                <td style={{ padding: "var(--space-lg) var(--space-sm)", maxWidth: "280px" }}>
                  <div style={{ color: "var(--color-text-80)", fontSize: "var(--font-size-text-sm)", lineHeight: 1.4 }}>
                    {trade.marketQuestion}
                  </div>
                  {trade.txHash && (
                    <span className="mono" style={{ color: "var(--color-emerald-50)", fontSize: "var(--font-size-text-xs)" }}>
                      {trade.txHash}
                    </span>
                  )}
                </td>
                <td style={{ padding: "var(--space-lg) var(--space-sm)", textAlign: "center" }}>
                  <span className={`tag ${trade.side === "YES" ? "tag-yes" : "tag-no"}`}>
                    {trade.side}
                  </span>
                </td>
                <td style={{ padding: "var(--space-lg) var(--space-sm)", textAlign: "right", fontFamily: "var(--font-family-code), monospace" }}>
                  {trade.amount}
                </td>
                <td style={{ padding: "var(--space-lg) var(--space-sm)", textAlign: "right", fontFamily: "var(--font-family-code), monospace" }}>
                  ${trade.price.toFixed(2)}
                </td>
                <td style={{ padding: "var(--space-lg) var(--space-sm)", textAlign: "center" }}>
                  <span style={{
                    fontSize: "var(--font-size-text-xs)",
                    color: trade.status === "filled" ? "var(--color-green-50)" : trade.status === "cancelled" ? "var(--color-red-60)" : "var(--color-yellow-50)",
                  }}>
                    {trade.status}
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
