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
      label: "Rebalance Success Rate",
      value: `${pnl.winRate.toFixed(1)}%`,
      color: pnl.winRate >= 50 ? "var(--color-green-50)" : "var(--color-red-60)",
      detail: `${pnl.wins} profitable / ${pnl.losses} costly`,
    },
    {
      label: "Total Rebalances",
      value: pnl.totalTrades.toString(),
    },
    {
      label: "Total Volume Managed",
      value: `$${pnl.totalVolume.toLocaleString()}`,
    },
    {
      label: "Avg Position Size",
      value: `$${pnl.avgTradeSize.toFixed(2)}`,
    },
    {
      label: "Best Rebalance",
      value: `+$${pnl.bestTrade.toFixed(2)}`,
      color: "var(--color-green-50)",
    },
    {
      label: "Worst Rebalance",
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
          {pnl.totalTrades} rebalances
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
          The agent has executed {pnl.totalTrades} rebalances managing ${pnl.totalVolume.toLocaleString()} in liquidity.
          {pnl.totalPnl >= 0 ? (
            <span style={{ color: "var(--color-green-50)" }}>
              {" "}Net positive with ${pnl.totalPnl.toFixed(2)} earned from fees minus gas costs.
            </span>
          ) : (
            <span style={{ color: "var(--color-red-60)" }}>
              {" "}Currently net negative at -${Math.abs(pnl.totalPnl).toFixed(2)} (gas costs exceed fee earnings).
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
