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
      label: "Total Arbs",
      value: pnl.totalTrades.toString(),
    },
    {
      label: "Total Volume",
      value: `$${pnl.totalVolume.toLocaleString()}`,
    },
    {
      label: "Avg Arb Size",
      value: `$${pnl.avgTradeSize.toFixed(2)}`,
    },
    {
      label: "Best Arb",
      value: `+$${pnl.bestTrade.toFixed(2)}`,
      color: "var(--color-green-50)",
    },
    {
      label: "Worst Arb",
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
          {pnl.totalTrades} arbs
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
    </div>
  );
}
