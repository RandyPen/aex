"use client";

import type { ArbOpportunity } from "@/lib/types";

interface ArbOpportunitiesProps {
  opportunities: ArbOpportunity[];
}

function formatTime(ts: string): string {
  return new Date(ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
}

export function ArbOpportunities({ opportunities }: ArbOpportunitiesProps) {
  return (
    <div className="card" style={{ overflow: "auto" }}>
      <div className="card-header">
        <span className="card-title">Arb Opportunities</span>
        <span style={{
          fontSize: "var(--font-size-text-xs)",
          fontFamily: "var(--font-family-code), monospace",
          color: "var(--color-text-40)",
        }}>
          {opportunities.length} total
        </span>
      </div>

      <table className="arb-table">
        <thead>
          <tr>
            <th>Market Pair</th>
            <th>Strategy</th>
            <th>Spread</th>
            <th>Expected</th>
            <th>Actual</th>
            <th>Status</th>
            <th>Detected</th>
          </tr>
        </thead>
        <tbody>
          {opportunities.map((opp) => (
            <tr key={opp.id}>
              <td>
                <div style={{ fontSize: "var(--font-size-text-sm)", color: "var(--color-text-90)", marginBottom: 2 }}>
                  {opp.marketAQuestion.length > 40 ? opp.marketAQuestion.slice(0, 40) + "..." : opp.marketAQuestion}
                </div>
                <div className="market-question">
                  vs. {opp.marketBQuestion.length > 40 ? opp.marketBQuestion.slice(0, 40) + "..." : opp.marketBQuestion}
                </div>
              </td>
              <td>
                <span className={`tag tag-${opp.strategy}`}>{opp.strategy}</span>
              </td>
              <td>
                <span className="mono" style={{ color: "var(--color-text-90)" }}>
                  {opp.spreadBps} bps
                </span>
              </td>
              <td>
                <span className="mono" style={{ color: "var(--color-green-50)" }}>
                  +${opp.expectedProfit.toFixed(2)}
                </span>
              </td>
              <td>
                {opp.actualProfit !== null ? (
                  <span className="mono" style={{
                    color: opp.actualProfit >= 0 ? "var(--color-green-50)" : "var(--color-red-60)",
                  }}>
                    {opp.actualProfit >= 0 ? "+" : ""}${opp.actualProfit.toFixed(2)}
                  </span>
                ) : (
                  <span className="mono" style={{ color: "var(--color-text-40)" }}>--</span>
                )}
              </td>
              <td>
                <span className={`tag tag-${opp.status}`}>{opp.status}</span>
              </td>
              <td>
                <span className="mono" style={{ color: "var(--color-text-40)" }}>
                  {formatTime(opp.detectedAt)}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
