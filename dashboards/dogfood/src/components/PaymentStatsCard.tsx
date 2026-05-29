"use client";

import type { PaymentStats } from "@/lib/types";

interface PaymentStatsCardProps {
  stats: PaymentStats;
}

function formatDate(ts: string): string {
  if (!ts) return "--";
  return new Date(ts).toLocaleDateString([], {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function PaymentStatsCard({ stats }: PaymentStatsCardProps) {
  const rows: { label: string; value: string; color?: string }[] = [
    {
      label: "Total Payments Sent",
      value: stats.totalPaymentsSent.toString(),
    },
    {
      label: "Total USD Value",
      value: `$${stats.totalUsdValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
    },
    {
      label: "Active Schedules",
      value: stats.activeSchedules.toString(),
    },
    {
      label: "Total Schedules",
      value: stats.totalSchedules.toString(),
    },
    {
      label: "Payments This Month",
      value: stats.paymentsThisMonth.toString(),
    },
    {
      label: "Failed Payments",
      value: stats.failedPayments.toString(),
      color: stats.failedPayments > 0 ? "var(--color-red-60)" : "var(--color-green-50)",
    },
    {
      label: "Next Payment Due",
      value: formatDate(stats.nextPaymentDue),
    },
  ];

  return (
    <div className="card">
      <div className="card-header">
        <span className="card-title">Payment Statistics</span>
      </div>

      {rows.map((row) => (
        <div key={row.label} className="config-row">
          <span className="config-key">{row.label}</span>
          <span
            className="config-value"
            style={{ color: row.color || "var(--color-text-90)" }}
          >
            {row.value}
          </span>
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
          Payment summary
        </div>
        <div style={{ color: "var(--color-text-60)" }}>
          The agent has executed {stats.totalPaymentsSent} payments totaling ${stats.totalUsdValue.toLocaleString(undefined, { minimumFractionDigits: 2 })}.
          {stats.failedPayments === 0 ? (
            <span style={{ color: "var(--color-green-50)" }}> All payments have been delivered successfully.</span>
          ) : (
            <span style={{ color: "var(--color-red-60)" }}> {stats.failedPayments} payment{stats.failedPayments !== 1 ? "s" : ""} failed and may need attention.</span>
          )}
        </div>
      </div>
    </div>
  );
}
