"use client";

import type { OpenArbPosition } from "@/lib/types";

interface OpenPositionsProps {
  positions: OpenArbPosition[];
}

function formatTime(ts: string): string {
  return new Date(ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
}

export function OpenPositions({ positions }: OpenPositionsProps) {
  if (positions.length === 0) {
    return (
      <div className="card">
        <div className="card-header">
          <span className="card-title">Open Positions</span>
        </div>
        <p style={{ color: "var(--color-text-40)", fontSize: "var(--font-size-text-sm)" }}>
          No open arb positions.
        </p>
      </div>
    );
  }

  return (
    <div className="card">
      <div className="card-header">
        <span className="card-title">Open Positions</span>
        <span style={{
          fontSize: "var(--font-size-text-xs)",
          fontFamily: "var(--font-family-code), monospace",
          color: "var(--color-text-40)",
        }}>
          {positions.length} open
        </span>
      </div>

      {positions.map((pos) => (
        <div key={pos.id} style={{
          padding: "var(--space-2xl) 0",
          borderBottom: "1px solid var(--color-border-20)",
        }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "var(--space-md)" }}>
            <div>
              <div style={{ fontSize: "var(--font-size-text-sm)", fontWeight: "var(--font-weight-med)", marginBottom: 2 }}>
                {pos.marketAQuestion}
              </div>
              <div style={{ fontSize: "var(--font-size-text-xs)", color: "var(--color-text-40)" }}>
                vs. {pos.marketBQuestion}
              </div>
            </div>
            <span className="mono" style={{
              fontSize: "var(--font-size-text-sm)",
              fontWeight: "var(--font-weight-semi)",
              color: pos.unrealizedPnl >= 0 ? "var(--color-green-50)" : "var(--color-red-60)",
            }}>
              {pos.unrealizedPnl >= 0 ? "+" : ""}${pos.unrealizedPnl.toFixed(2)}
            </span>
          </div>

          <div style={{ display: "flex", gap: "var(--space-4xl)", flexWrap: "wrap" }}>
            <div>
              <span style={{ fontSize: "var(--font-size-text-xs)", color: "var(--color-text-40)" }}>Leg A</span>
              <div><span className={`tag tag-${pos.legAStatus}`}>{pos.legAStatus}</span></div>
            </div>
            <div>
              <span style={{ fontSize: "var(--font-size-text-xs)", color: "var(--color-text-40)" }}>Leg B</span>
              <div><span className={`tag tag-${pos.legBStatus}`}>{pos.legBStatus}</span></div>
            </div>
            <div>
              <span style={{ fontSize: "var(--font-size-text-xs)", color: "var(--color-text-40)" }}>Entry Spread</span>
              <div className="mono" style={{ fontSize: "var(--font-size-text-sm)" }}>{pos.entrySpreadBps} bps</div>
            </div>
            <div>
              <span style={{ fontSize: "var(--font-size-text-xs)", color: "var(--color-text-40)" }}>Current Spread</span>
              <div className="mono" style={{ fontSize: "var(--font-size-text-sm)" }}>{pos.currentSpreadBps} bps</div>
            </div>
            <div>
              <span style={{ fontSize: "var(--font-size-text-xs)", color: "var(--color-text-40)" }}>Opened</span>
              <div className="mono" style={{ fontSize: "var(--font-size-text-sm)", color: "var(--color-text-40)" }}>{formatTime(pos.openedAt)}</div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
