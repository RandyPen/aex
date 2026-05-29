"use client";

import type { PaymentScheduleItem } from "@/lib/types";

interface UpcomingPaymentsProps {
  schedules: PaymentScheduleItem[];
}

function timeUntil(ts: string): string {
  const ms = new Date(ts).getTime() - Date.now();
  if (ms <= 0) return "overdue";
  if (ms < 3_600_000) return `in ${Math.round(ms / 60_000)}m`;
  if (ms < 86_400_000) return `in ${Math.round(ms / 3_600_000)}h`;
  return `in ${Math.round(ms / 86_400_000)}d`;
}

function formatDate(ts: string): string {
  return new Date(ts).toLocaleDateString([], {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

export function UpcomingPayments({ schedules }: UpcomingPaymentsProps) {
  const activeSchedules = schedules
    .filter((s) => s.status === "active")
    .sort((a, b) => new Date(a.nextDueDate).getTime() - new Date(b.nextDueDate).getTime())
    .slice(0, 5);

  if (!activeSchedules.length) {
    return (
      <div className="card">
        <div className="card-header">
          <span className="card-title">Upcoming Payments</span>
        </div>
        <p style={{ color: "var(--color-text-40)", fontSize: "var(--font-size-text-sm)" }}>No upcoming payments scheduled.</p>
      </div>
    );
  }

  return (
    <div className="card">
      <div className="card-header">
        <span className="card-title">Upcoming Payments</span>
        <span style={{ fontSize: "var(--font-size-text-xs)", color: "var(--color-text-40)" }}>
          next {activeSchedules.length}
        </span>
      </div>

      {activeSchedules.map((schedule, i) => {
        const isOverdue = new Date(schedule.nextDueDate).getTime() < Date.now();
        return (
          <div key={i} style={{
            padding: "var(--space-2xl) 0",
            borderBottom: i < activeSchedules.length - 1 ? "1px solid var(--color-border-20)" : "none",
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: "var(--font-size-text-sm)", color: "var(--color-text-80)", marginBottom: "var(--space-xs)" }}>
                  {schedule.label}
                </div>
                <div style={{ display: "flex", gap: "var(--space-md)", alignItems: "center" }}>
                  <span className="mono" style={{ fontSize: "var(--font-size-text-xs)", color: "var(--color-text-40)" }}>
                    {schedule.recipient}
                  </span>
                  <span className="tag tag-protocol">{schedule.interval}</span>
                </div>
              </div>
              <div style={{ textAlign: "right", flexShrink: 0 }}>
                <div style={{
                  fontFamily: "var(--font-family-code), monospace",
                  fontSize: "var(--font-size-text-sm)",
                  fontWeight: "var(--font-weight-semi)",
                  color: "var(--color-text-80)",
                }}>
                  {schedule.amount} {schedule.token}
                </div>
                <div style={{
                  fontSize: "var(--font-size-text-xs)",
                  color: isOverdue ? "var(--color-red-60)" : "var(--color-text-40)",
                  fontFamily: "var(--font-family-code), monospace",
                }}>
                  {timeUntil(schedule.nextDueDate)}
                </div>
              </div>
            </div>
            <div style={{
              marginTop: "var(--space-md)",
              fontSize: "var(--font-size-text-xs)",
              color: "var(--color-text-40)",
            }}>
              Due: {formatDate(schedule.nextDueDate)}
            </div>
          </div>
        );
      })}
    </div>
  );
}
