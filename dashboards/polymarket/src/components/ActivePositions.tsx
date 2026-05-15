"use client";

import type { PositionData } from "@/lib/types";

interface ActivePositionsProps {
  positions: PositionData[];
}

export function ActivePositions({ positions }: ActivePositionsProps) {
  if (!positions.length) {
    return (
      <div className="card">
        <div className="card-header">
          <span className="card-title">Active Positions</span>
        </div>
        <p style={{ color: "var(--color-text-40)", fontSize: "var(--font-size-text-sm)" }}>No open positions.</p>
      </div>
    );
  }

  const totalPnl = positions.reduce((sum, p) => sum + p.pnl, 0);
  const totalValue = positions.reduce((sum, p) => sum + p.amount * p.currentPrice, 0);

  return (
    <div className="card">
      <div className="card-header">
        <span className="card-title">Active Positions</span>
        <div style={{ textAlign: "right" }}>
          <span style={{
            fontSize: "var(--font-size-text-xs)",
            fontFamily: "var(--font-family-code), monospace",
            color: totalPnl >= 0 ? "var(--color-green-50)" : "var(--color-red-60)",
          }}>
            {totalPnl >= 0 ? "+" : ""}${totalPnl.toFixed(2)} total
          </span>
          <div style={{ fontSize: "var(--font-size-text-xs)", color: "var(--color-text-40)" }}>
            ${totalValue.toFixed(2)} value
          </div>
        </div>
      </div>

      {positions.map((pos, i) => (
        <div key={i} style={{
          padding: "var(--space-2xl) 0",
          borderBottom: i < positions.length - 1 ? "1px solid var(--color-border-20)" : "none",
        }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "var(--space-md)" }}>
            <div style={{ flex: 1, marginRight: "var(--space-2xl)" }}>
              <div style={{ fontSize: "var(--font-size-text-sm)", color: "var(--color-text-80)", lineHeight: 1.4, marginBottom: "var(--space-xs)" }}>
                {pos.marketQuestion}
              </div>
              <span className={`tag ${pos.side === "YES" ? "tag-yes" : "tag-no"}`}>
                {pos.side}
              </span>
            </div>
            <div style={{ textAlign: "right", flexShrink: 0 }}>
              <div style={{
                fontFamily: "var(--font-family-code), monospace",
                fontSize: "var(--font-size-text-sm)",
                fontWeight: "var(--font-weight-semi)",
                color: pos.pnl >= 0 ? "var(--color-green-50)" : "var(--color-red-60)",
              }}>
                {pos.pnl >= 0 ? "+" : ""}${pos.pnl.toFixed(2)}
              </div>
              <div style={{
                fontFamily: "var(--font-family-code), monospace",
                fontSize: "var(--font-size-text-xs)",
                color: pos.pnlPct >= 0 ? "var(--color-green-50)" : "var(--color-red-60)",
              }}>
                {pos.pnlPct >= 0 ? "+" : ""}{pos.pnlPct.toFixed(1)}%
              </div>
            </div>
          </div>

          <div style={{ display: "flex", gap: "var(--space-3xl)", fontSize: "var(--font-size-text-xs)" }}>
            <div>
              <span style={{ color: "var(--color-text-40)" }}>Shares: </span>
              <span className="mono" style={{ color: "var(--color-text-60)" }}>{pos.amount}</span>
            </div>
            <div>
              <span style={{ color: "var(--color-text-40)" }}>Avg: </span>
              <span className="mono" style={{ color: "var(--color-text-60)" }}>${pos.avgPrice.toFixed(2)}</span>
            </div>
            <div>
              <span style={{ color: "var(--color-text-40)" }}>Current: </span>
              <span className="mono" style={{ color: "var(--color-text-60)" }}>${pos.currentPrice.toFixed(2)}</span>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
