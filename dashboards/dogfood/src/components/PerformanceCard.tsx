"use client";

import type { PerformanceData } from "@/lib/types";

interface PerformanceCardProps {
  performance: PerformanceData;
}

export function PerformanceCard({ performance }: PerformanceCardProps) {
  const { initialBalance, currentBalance, pnl, pnlPct, totalGasSpent, rebalanceCount, uptimeHours, estimatedApy } = performance;

  const netProfit = pnl - totalGasSpent;
  const isProfitable = netProfit >= 0;

  const rows: { label: string; value: string; color?: string; detail?: string }[] = [
    {
      label: "Starting Wallet Balance",
      value: `${initialBalance.toFixed(4)} SUI`,
      detail: "After depositing into pool",
    },
    {
      label: "Current Wallet Balance",
      value: `${currentBalance.toFixed(4)} SUI`,
    },
    {
      label: "Profit / Loss",
      value: `${pnl >= 0 ? "+" : ""}${pnl.toFixed(4)} SUI`,
      color: pnl >= 0 ? "var(--color-green-50)" : "var(--color-red-60)",
      detail: `${pnlPct >= 0 ? "+" : ""}${pnlPct.toFixed(2)}%`,
    },
    {
      label: "Transaction Fees Paid",
      value: `${totalGasSpent.toFixed(4)} SUI`,
      detail: `${rebalanceCount} reposition${rebalanceCount !== 1 ? "s" : ""}`,
    },
    {
      label: "Net Profit",
      value: `${netProfit >= 0 ? "+" : ""}${netProfit.toFixed(4)} SUI`,
      color: isProfitable ? "var(--color-green-50)" : "var(--color-red-60)",
      detail: "After transaction fees",
    },
    {
      label: "Estimated Annual Return",
      value: uptimeHours > 1 ? `${estimatedApy.toFixed(1)}%` : "Calculating...",
      color: estimatedApy >= 0 ? "var(--color-green-50)" : "var(--color-red-60)",
      detail: uptimeHours > 1 ? `Based on ${Math.round(uptimeHours)}h of data` : "Need more data",
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
          {Math.round(uptimeHours)}h running
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

      {/* Hold Comparison */}
      <div style={{
        marginTop: "var(--space-2xl)",
        padding: "var(--space-2xl)",
        background: "var(--color-background-10)",
        borderRadius: "var(--radi-md)",
        fontSize: "var(--font-size-text-xs)",
      }}>
        <div style={{ color: "var(--color-text-40)", marginBottom: "var(--space-xs)" }}>
          Would doing nothing have been better?
        </div>
        <div style={{ color: "var(--color-text-60)" }}>
          Wallet balance was {initialBalance.toFixed(4)} SUI after depositing into the pool.
          Now it is {currentBalance.toFixed(4)} SUI.
          {pnl !== 0 && (
            <span style={{ color: isProfitable ? "var(--color-green-50)" : "var(--color-red-60)" }}>
              {" "}The agent is {isProfitable ? "ahead" : "behind"} by {Math.abs(netProfit).toFixed(4)} SUI compared to just holding.
            </span>
          )}
          {pnl === 0 && (
            <span> No change yet.</span>
          )}
        </div>
      </div>
    </div>
  );
}
