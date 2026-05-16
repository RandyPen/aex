"use client";

import type { PnLData } from "@/lib/types";

interface PnLCardProps {
  pnl: PnLData;
}

export function PnLCard({ pnl }: PnLCardProps) {
  const rows: { label: string; value: string; color?: string; detail?: string }[] = [
    {
      label: "Total Profit / Loss",
      value: `${pnl.totalPnl >= 0 ? "+" : ""}$${pnl.totalPnl.toFixed(2)}`,
      color: pnl.totalPnl >= 0 ? "var(--color-green-50)" : "var(--color-red-60)",
      detail: `${pnl.totalPnlPct >= 0 ? "+" : ""}${pnl.totalPnlPct.toFixed(2)}%`,
    },
    {
      label: "Win Rate",
      value: `${pnl.winRate.toFixed(1)}%`,
      color: pnl.winRate >= 50 ? "var(--color-green-50)" : "var(--color-red-60)",
      detail: `${pnl.wins}W / ${pnl.losses}L`,
    },
    {
      label: "Total Trades",
      value: pnl.totalTrades.toString(),
    },
    {
      label: "Total Volume",
      value: `$${pnl.totalVolume.toLocaleString()}`,
    },
    {
      label: "Average Trade Size",
      value: `$${pnl.avgTradeSize.toFixed(2)}`,
    },
    {
      label: "Best Trade",
      value: `+$${pnl.bestTrade.toFixed(2)}`,
      color: "var(--color-green-50)",
    },
    {
      label: "Worst Trade",
      value: `-$${Math.abs(pnl.worstTrade).toFixed(2)}`,
      color: "var(--color-red-60)",
    },
  ];

  return (
    <div className="card">
      <div className="card-header">
        <span className="card-title">Performance</span>
        <span style={{
          fontSize: "var(--font-size-text-xs)",
          fontFamily: "var(--font-family-code), monospace",
          color: "var(--color-text-40)",
        }}>
          {pnl.totalTrades} trades
        </span>
      </div>

      {rows.map((row) => (
        <div key={row.label} className="config-row">
          <span className="config-key">{row.label}</span>
          <div style={{ textAlign: "right" }}>
            <span
              className="config-value"
              style={{ color: row.color || "var(--color-text-90)" }}
            >
              {row.value}
            </span>
            {row.detail && (
              <div style={{ fontSize: "var(--font-size-text-xs)", color: "var(--color-text-40)" }}>
                {row.detail}
              </div>
            )}
          </div>
        </div>
      ))}

      <div style={{
        marginTop: "var(--space-2xl)",
        padding: "var(--space-2xl)",
        background: "var(--color-background-10)",
        borderRadius: "var(--radi-md)",
        fontSize: "var(--font-size-text-xs)",
      }}>
        <div style={{ color: "var(--color-text-40)", marginBottom: "var(--space-xs)" }}>
          Strategy summary
        </div>
        <div style={{ color: "var(--color-text-60)" }}>
          The agent has placed {pnl.totalTrades} trades with a {pnl.winRate.toFixed(0)}% win rate.
          {pnl.totalPnl >= 0 ? (
            <span style={{ color: "var(--color-green-50)" }}>
              {" "}Overall profitable with ${pnl.totalPnl.toFixed(2)} in gains.
            </span>
          ) : (
            <span style={{ color: "var(--color-red-60)" }}>
              {" "}Currently at a loss of ${Math.abs(pnl.totalPnl).toFixed(2)}.
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
