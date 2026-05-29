"use client";

import type { LLMStatsData } from "@/lib/types";

interface LLMStatsProps {
  stats: LLMStatsData;
}

export function LLMStats({ stats }: LLMStatsProps) {
  const rows: { label: string; value: string; color?: string; detail?: string }[] = [
    {
      label: "Total Analyses Run",
      value: stats.totalAnalyses.toString(),
    },
    {
      label: "Trades Placed",
      value: stats.tradesPlaced.toString(),
      color: "var(--color-green-50)",
      detail: `${((stats.tradesPlaced / Math.max(stats.totalAnalyses, 1)) * 100).toFixed(0)}% conversion rate`,
    },
    {
      label: "Trades Skipped",
      value: stats.tradesSkipped.toString(),
      color: "var(--color-text-40)",
      detail: "Below confidence threshold",
    },
    {
      label: "Avg Confidence",
      value: `${(stats.avgConfidence * 100).toFixed(1)}%`,
      color: stats.avgConfidence >= stats.confidenceThreshold ? "var(--color-green-50)" : "var(--color-yellow-50)",
    },
    {
      label: "Win Rate (Traded)",
      value: `${stats.winRateOnTrades.toFixed(1)}%`,
      color: stats.winRateOnTrades >= 50 ? "var(--color-green-50)" : "var(--color-red-60)",
    },
    {
      label: "Confidence Threshold",
      value: `${(stats.confidenceThreshold * 100).toFixed(0)}%`,
    },
    {
      label: "LLM Provider",
      value: stats.llmProvider,
    },
    {
      label: "LLM Model",
      value: stats.llmModel,
    },
    {
      label: "Total LLM API Cost",
      value: `$${stats.totalLLMCost.toFixed(2)}`,
      detail: `~$${(stats.totalLLMCost / Math.max(stats.totalAnalyses, 1)).toFixed(4)} per analysis`,
    },
  ];

  return (
    <div className="card">
      <div className="card-header">
        <span className="card-title">LLM Performance</span>
        <span style={{
          fontSize: "var(--font-size-text-xs)",
          fontFamily: "var(--font-family-code), monospace",
          color: "var(--color-text-40)",
        }}>
          {stats.totalAnalyses} analyses
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
          The LLM has analyzed {stats.totalAnalyses} markets and placed {stats.tradesPlaced} trades
          ({((stats.tradesPlaced / Math.max(stats.totalAnalyses, 1)) * 100).toFixed(0)}% of analyses exceeded
          the {(stats.confidenceThreshold * 100).toFixed(0)}% confidence threshold).
          {stats.winRateOnTrades >= 50 ? (
            <span style={{ color: "var(--color-green-50)" }}>
              {" "}Trades placed have a {stats.winRateOnTrades.toFixed(0)}% win rate, validating the LLM filtering approach.
            </span>
          ) : (
            <span style={{ color: "var(--color-red-60)" }}>
              {" "}Win rate of {stats.winRateOnTrades.toFixed(0)}% on placed trades suggests the model may need recalibration.
            </span>
          )}
          {" "}Total LLM API cost: ${stats.totalLLMCost.toFixed(2)}.
        </div>
      </div>
    </div>
  );
}
