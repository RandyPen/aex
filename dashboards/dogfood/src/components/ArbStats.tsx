"use client";

import type { ArbOpportunity } from "@/lib/types";

interface ArbStatsProps {
  opportunities: ArbOpportunity[];
}

export function ArbStats({ opportunities }: ArbStatsProps) {
  const detected = opportunities.length;
  const executed = opportunities.filter((o) => o.status === "complete" || o.status === "failed").length;
  const successful = opportunities.filter((o) => o.status === "complete" && (o.actualProfit ?? 0) > 0).length;
  const successRate = executed > 0 ? (successful / executed) * 100 : 0;
  const totalProfit = opportunities
    .filter((o) => o.actualProfit !== null)
    .reduce((sum, o) => sum + (o.actualProfit ?? 0), 0);
  const spreads = opportunities.map((o) => o.spreadBps);
  const avgSpread = spreads.length > 0 ? spreads.reduce((a, b) => a + b, 0) / spreads.length : 0;
  const bestArb = opportunities
    .filter((o) => o.actualProfit !== null)
    .reduce((best, o) => Math.max(best, o.actualProfit ?? 0), 0);

  const stats = [
    { label: "Detected", value: detected.toString() },
    { label: "Executed", value: executed.toString() },
    { label: "Success Rate", value: `${successRate.toFixed(0)}%`, color: successRate >= 60 ? "var(--color-green-50)" : "var(--color-red-60)" },
    { label: "Total Profit", value: `${totalProfit >= 0 ? "+" : ""}$${totalProfit.toFixed(2)}`, color: totalProfit >= 0 ? "var(--color-green-50)" : "var(--color-red-60)" },
    { label: "Avg Spread", value: `${avgSpread.toFixed(0)} bps` },
    { label: "Best Arb", value: `+$${bestArb.toFixed(2)}`, color: "var(--color-green-50)" },
  ];

  return (
    <div className="grid grid-6" style={{ marginBottom: "var(--space-4xl)" }}>
      {stats.map((s) => (
        <div key={s.label} className="card">
          <div className="stat-label">{s.label}</div>
          <div className="stat-value" style={{ color: s.color, fontSize: "var(--font-size-text-xl)" }}>
            {s.value}
          </div>
        </div>
      ))}
    </div>
  );
}
