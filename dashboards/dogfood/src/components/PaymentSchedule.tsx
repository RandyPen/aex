"use client";

import type { PaymentScheduleItem } from "@/lib/types";

interface PaymentScheduleProps {
  schedules: PaymentScheduleItem[];
}

function formatDate(ts: string): string {
  return new Date(ts).toLocaleDateString([], {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function PaymentSchedule({ schedules }: PaymentScheduleProps) {
  if (!schedules.length) {
    return (
      <div className="card">
        <div className="card-header">
          <span className="card-title">Payment Schedules</span>
        </div>
        <p style={{ color: "var(--color-text-40)", fontSize: "var(--font-size-text-sm)" }}>No payment schedules configured.</p>
      </div>
    );
  }

  return (
    <div className="card">
      <div className="card-header">
        <span className="card-title">Payment Schedules</span>
        <span style={{ fontSize: "var(--font-size-text-xs)", color: "var(--color-text-40)" }}>
          {schedules.length} schedules
        </span>
      </div>
      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "var(--font-size-text-sm)" }}>
          <thead>
            <tr style={{ borderBottom: "1px solid var(--color-border-20)" }}>
              <th style={{ textAlign: "left", padding: "var(--space-md) var(--space-sm)", color: "var(--color-text-40)", fontWeight: "var(--font-weight-med)", fontSize: "var(--font-size-text-xs)" }}>Recipient</th>
              <th style={{ textAlign: "left", padding: "var(--space-md) var(--space-sm)", color: "var(--color-text-40)", fontWeight: "var(--font-weight-med)", fontSize: "var(--font-size-text-xs)" }}>Label</th>
              <th style={{ textAlign: "right", padding: "var(--space-md) var(--space-sm)", color: "var(--color-text-40)", fontWeight: "var(--font-weight-med)", fontSize: "var(--font-size-text-xs)" }}>Amount</th>
              <th style={{ textAlign: "center", padding: "var(--space-md) var(--space-sm)", color: "var(--color-text-40)", fontWeight: "var(--font-weight-med)", fontSize: "var(--font-size-text-xs)" }}>Interval</th>
              <th style={{ textAlign: "left", padding: "var(--space-md) var(--space-sm)", color: "var(--color-text-40)", fontWeight: "var(--font-weight-med)", fontSize: "var(--font-size-text-xs)" }}>Next Due</th>
              <th style={{ textAlign: "left", padding: "var(--space-md) var(--space-sm)", color: "var(--color-text-40)", fontWeight: "var(--font-weight-med)", fontSize: "var(--font-size-text-xs)" }}>Last Paid</th>
              <th style={{ textAlign: "center", padding: "var(--space-md) var(--space-sm)", color: "var(--color-text-40)", fontWeight: "var(--font-weight-med)", fontSize: "var(--font-size-text-xs)" }}>Status</th>
            </tr>
          </thead>
          <tbody>
            {schedules.map((schedule, i) => (
              <tr key={i} style={{ borderBottom: "1px solid var(--color-border-20)" }}>
                <td style={{ padding: "var(--space-lg) var(--space-sm)" }}>
                  <span className="mono" style={{ color: "var(--color-text-60)", fontSize: "var(--font-size-text-xs)" }}>
                    {schedule.recipient}
                  </span>
                </td>
                <td style={{ padding: "var(--space-lg) var(--space-sm)", color: "var(--color-text-80)" }}>
                  {schedule.label}
                </td>
                <td style={{ padding: "var(--space-lg) var(--space-sm)", textAlign: "right", fontFamily: "var(--font-family-code), monospace" }}>
                  {schedule.amount} {schedule.token}
                </td>
                <td style={{ padding: "var(--space-lg) var(--space-sm)", textAlign: "center" }}>
                  <span className="tag tag-protocol">{schedule.interval}</span>
                </td>
                <td style={{ padding: "var(--space-lg) var(--space-sm)", whiteSpace: "nowrap" }}>
                  <span className="mono" style={{ color: "var(--color-text-40)", fontSize: "var(--font-size-text-xs)" }}>
                    {formatDate(schedule.nextDueDate)}
                  </span>
                </td>
                <td style={{ padding: "var(--space-lg) var(--space-sm)", whiteSpace: "nowrap" }}>
                  <span className="mono" style={{ color: "var(--color-text-40)", fontSize: "var(--font-size-text-xs)" }}>
                    {schedule.lastPaidDate ? formatDate(schedule.lastPaidDate) : "never"}
                  </span>
                </td>
                <td style={{ padding: "var(--space-lg) var(--space-sm)", textAlign: "center" }}>
                  <span className={`tag ${schedule.status === "active" ? "tag-active" : "tag-paused"}`}>
                    {schedule.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
