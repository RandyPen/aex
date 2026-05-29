"use client";

import type { PaymentEvent } from "@/lib/types";

interface PaymentHistoryProps {
  payments: PaymentEvent[];
}

function formatTime(ts: string): string {
  return new Date(ts).toLocaleString([], {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function PaymentHistory({ payments }: PaymentHistoryProps) {
  if (!payments.length) {
    return (
      <div className="card">
        <div className="card-header">
          <span className="card-title">Payment History</span>
        </div>
        <p style={{ color: "var(--color-text-40)", fontSize: "var(--font-size-text-sm)" }}>No payments executed yet.</p>
      </div>
    );
  }

  return (
    <div className="card">
      <div className="card-header">
        <span className="card-title">Payment History</span>
        <span style={{ fontSize: "var(--font-size-text-xs)", color: "var(--color-text-40)" }}>
          {payments.length} payments
        </span>
      </div>
      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "var(--font-size-text-sm)" }}>
          <thead>
            <tr style={{ borderBottom: "1px solid var(--color-border-20)" }}>
              <th style={{ textAlign: "left", padding: "var(--space-md) var(--space-sm)", color: "var(--color-text-40)", fontWeight: "var(--font-weight-med)", fontSize: "var(--font-size-text-xs)" }}>Time</th>
              <th style={{ textAlign: "left", padding: "var(--space-md) var(--space-sm)", color: "var(--color-text-40)", fontWeight: "var(--font-weight-med)", fontSize: "var(--font-size-text-xs)" }}>Recipient</th>
              <th style={{ textAlign: "left", padding: "var(--space-md) var(--space-sm)", color: "var(--color-text-40)", fontWeight: "var(--font-weight-med)", fontSize: "var(--font-size-text-xs)" }}>Label</th>
              <th style={{ textAlign: "right", padding: "var(--space-md) var(--space-sm)", color: "var(--color-text-40)", fontWeight: "var(--font-weight-med)", fontSize: "var(--font-size-text-xs)" }}>Amount</th>
              <th style={{ textAlign: "left", padding: "var(--space-md) var(--space-sm)", color: "var(--color-text-40)", fontWeight: "var(--font-weight-med)", fontSize: "var(--font-size-text-xs)" }}>Tx Hash</th>
              <th style={{ textAlign: "center", padding: "var(--space-md) var(--space-sm)", color: "var(--color-text-40)", fontWeight: "var(--font-weight-med)", fontSize: "var(--font-size-text-xs)" }}>Status</th>
            </tr>
          </thead>
          <tbody>
            {payments.map((payment, i) => (
              <tr key={i} style={{ borderBottom: "1px solid var(--color-border-20)" }}>
                <td style={{ padding: "var(--space-lg) var(--space-sm)", whiteSpace: "nowrap" }}>
                  <span className="mono" style={{ color: "var(--color-text-40)" }}>{formatTime(payment.ts)}</span>
                </td>
                <td style={{ padding: "var(--space-lg) var(--space-sm)" }}>
                  <span className="mono" style={{ color: "var(--color-text-60)", fontSize: "var(--font-size-text-xs)" }}>
                    {payment.recipient}
                  </span>
                </td>
                <td style={{ padding: "var(--space-lg) var(--space-sm)", color: "var(--color-text-80)" }}>
                  {payment.label}
                </td>
                <td style={{ padding: "var(--space-lg) var(--space-sm)", textAlign: "right", fontFamily: "var(--font-family-code), monospace" }}>
                  {payment.amount} {payment.token}
                </td>
                <td style={{ padding: "var(--space-lg) var(--space-sm)" }}>
                  {payment.txHash ? (
                    <span className="mono" style={{ color: "var(--color-emerald-50)", fontSize: "var(--font-size-text-xs)" }}>
                      {payment.txHash}
                    </span>
                  ) : (
                    <span style={{ color: "var(--color-text-40)", fontSize: "var(--font-size-text-xs)" }}>--</span>
                  )}
                </td>
                <td style={{ padding: "var(--space-lg) var(--space-sm)", textAlign: "center" }}>
                  <span className={`tag ${payment.status === "sent" ? "tag-sent" : payment.status === "failed" ? "tag-failed" : "tag-pending"}`}>
                    {payment.status}
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
