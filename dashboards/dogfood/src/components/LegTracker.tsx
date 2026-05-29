"use client";

import type { ArbOpportunity } from "@/lib/types";

interface LegTrackerProps {
  opportunities: ArbOpportunity[];
}

function formatTime(ts: string | null): string {
  if (!ts) return "--";
  return new Date(ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
}

function timingBetweenLegs(opp: ArbOpportunity): string {
  if (!opp.legA.filledAt || !opp.legB.filledAt) return "--";
  const diff = Math.abs(new Date(opp.legB.filledAt).getTime() - new Date(opp.legA.filledAt).getTime());
  if (diff < 1000) return `${diff}ms`;
  return `${(diff / 1000).toFixed(1)}s`;
}

export function LegTracker({ opportunities }: LegTrackerProps) {
  // Only show opportunities that have been executed or are executing
  const tracked = opportunities.filter((o) => o.status !== "detected");

  if (tracked.length === 0) {
    return (
      <div className="card">
        <div className="card-header">
          <span className="card-title">Leg Tracker</span>
        </div>
        <p style={{ color: "var(--color-text-40)", fontSize: "var(--font-size-text-sm)" }}>
          No executed arbs to track.
        </p>
      </div>
    );
  }

  return (
    <div className="card" style={{ overflow: "auto" }}>
      <div className="card-header">
        <span className="card-title">Leg Tracker</span>
        <span style={{
          fontSize: "var(--font-size-text-xs)",
          fontFamily: "var(--font-family-code), monospace",
          color: "var(--color-text-40)",
        }}>
          execution detail
        </span>
      </div>

      <table className="arb-table">
        <thead>
          <tr>
            <th>Arb</th>
            <th>Leg A</th>
            <th>Leg A Fill</th>
            <th>Leg B</th>
            <th>Leg B Fill</th>
            <th>Timing</th>
            <th>Result</th>
          </tr>
        </thead>
        <tbody>
          {tracked.map((opp) => (
            <tr key={opp.id}>
              <td>
                <div style={{ fontSize: "var(--font-size-text-xs)", color: "var(--color-text-90)" }}>
                  {opp.id}
                </div>
                <div style={{ fontSize: "var(--font-size-text-xs)", color: "var(--color-text-40)", marginTop: 2 }}>
                  {opp.marketAQuestion.length > 30 ? opp.marketAQuestion.slice(0, 30) + "..." : opp.marketAQuestion}
                </div>
              </td>
              <td>
                <div style={{ display: "flex", alignItems: "center", gap: "var(--space-sm)" }}>
                  <span className={`tag tag-${opp.legA.status}`}>{opp.legA.status}</span>
                  <span className="mono" style={{ color: "var(--color-text-40)" }}>
                    {opp.legA.side} {opp.legA.amount}
                  </span>
                </div>
                {opp.legA.fillPrice !== null && (
                  <div className="mono" style={{ fontSize: "var(--font-size-text-xs)", color: "var(--color-text-60)", marginTop: 2 }}>
                    @ ${opp.legA.fillPrice.toFixed(2)}
                  </div>
                )}
              </td>
              <td>
                <span className="mono" style={{ color: "var(--color-text-40)" }}>
                  {formatTime(opp.legA.filledAt)}
                </span>
              </td>
              <td>
                <div style={{ display: "flex", alignItems: "center", gap: "var(--space-sm)" }}>
                  <span className={`tag tag-${opp.legB.status}`}>{opp.legB.status}</span>
                  <span className="mono" style={{ color: "var(--color-text-40)" }}>
                    {opp.legB.side} {opp.legB.amount}
                  </span>
                </div>
                {opp.legB.fillPrice !== null && (
                  <div className="mono" style={{ fontSize: "var(--font-size-text-xs)", color: "var(--color-text-60)", marginTop: 2 }}>
                    @ ${opp.legB.fillPrice.toFixed(2)}
                  </div>
                )}
              </td>
              <td>
                <span className="mono" style={{ color: "var(--color-text-40)" }}>
                  {formatTime(opp.legB.filledAt)}
                </span>
              </td>
              <td>
                <span className="mono" style={{ color: "var(--color-text-60)" }}>
                  {timingBetweenLegs(opp)}
                </span>
              </td>
              <td>
                {opp.actualProfit !== null ? (
                  <span className="mono" style={{
                    fontWeight: "var(--font-weight-semi)",
                    color: opp.actualProfit >= 0 ? "var(--color-green-50)" : "var(--color-red-60)",
                  }}>
                    {opp.actualProfit >= 0 ? "+" : ""}${opp.actualProfit.toFixed(2)}
                  </span>
                ) : (
                  <span className="mono" style={{ color: "var(--color-text-40)" }}>pending</span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
