"use client";

import type { AllocationState } from "@/lib/types";

interface AllocationCardProps {
  allocation: AllocationState;
}

export function AllocationCard({ allocation }: AllocationCardProps) {
  const deviationColor =
    Math.abs(allocation.deviationPct) > 5
      ? "var(--color-red-60)"
      : Math.abs(allocation.deviationPct) > 2
        ? "var(--color-yellow-50)"
        : "var(--color-green-50)";

  return (
    <div className="card">
      <div className="card-header">
        <span className="card-title">Current Allocation</span>
        <span style={{
          fontSize: "var(--font-size-h6)",
          fontWeight: "var(--font-weight-semi)",
          fontFamily: "var(--font-family-code), monospace",
          color: "var(--color-text-90)",
        }}>
          ${allocation.totalValueUsd.toLocaleString(undefined, { minimumFractionDigits: 2 })}
        </span>
      </div>

      {/* Allocation bar */}
      <div style={{
        display: "flex",
        height: "12px",
        borderRadius: "var(--radi-full)",
        overflow: "hidden",
        marginBottom: "var(--space-2xl)",
      }}>
        <div style={{
          width: `${allocation.currentAllocationPct}%`,
          background: "var(--color-blue-50)",
          transition: "width 300ms ease",
        }} />
        <div style={{
          width: `${100 - allocation.currentAllocationPct}%`,
          background: "var(--color-green-50)",
          transition: "width 300ms ease",
        }} />
      </div>

      {/* Target vs current */}
      <div className="config-row">
        <span className="config-key">{allocation.targetToken} Value</span>
        <span className="config-value">
          ${allocation.targetTokenValueUsd.toLocaleString(undefined, { minimumFractionDigits: 2 })}
        </span>
      </div>
      <div className="config-row">
        <span className="config-key">{allocation.stableToken} Value</span>
        <span className="config-value">
          ${allocation.stableValueUsd.toLocaleString(undefined, { minimumFractionDigits: 2 })}
        </span>
      </div>
      <div className="config-row">
        <span className="config-key">Target Allocation</span>
        <span className="config-value">{allocation.targetAllocationPct}% / {100 - allocation.targetAllocationPct}%</span>
      </div>
      <div className="config-row">
        <span className="config-key">Current Allocation</span>
        <span className="config-value">{allocation.currentAllocationPct}% / {(100 - allocation.currentAllocationPct).toFixed(1)}%</span>
      </div>
      <div className="config-row">
        <span className="config-key">Deviation</span>
        <span className="config-value" style={{ color: deviationColor }}>
          {allocation.deviationPct >= 0 ? "+" : ""}{allocation.deviationPct}%
        </span>
      </div>

      {/* Token breakdown cards */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "var(--space-3xl)", marginTop: "var(--space-3xl)" }}>
        <div style={{
          padding: "var(--space-2xl)",
          background: "var(--color-blue-5)",
          borderRadius: "var(--radi-md)",
          border: "1px solid var(--color-blue-20)",
        }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "var(--space-md)" }}>
            <span style={{ fontSize: "var(--font-size-text-sm)", fontWeight: "var(--font-weight-semi)", color: "var(--color-blue-70)" }}>
              {allocation.targetToken}
            </span>
            <span style={{ fontSize: "var(--font-size-text-xs)", color: "var(--color-text-40)" }}>
              {allocation.currentAllocationPct}%
            </span>
          </div>
          <div style={{
            fontFamily: "var(--font-family-code), monospace",
            fontSize: "var(--font-size-text-lg)",
            fontWeight: "var(--font-weight-semi)",
            color: "var(--color-text-90)",
            marginBottom: "var(--space-xs)",
          }}>
            {allocation.targetTokenBalance.toFixed(4)}
          </div>
          <div style={{
            fontFamily: "var(--font-family-code), monospace",
            fontSize: "var(--font-size-text-xs)",
            color: "var(--color-text-40)",
          }}>
            ${allocation.targetTokenValueUsd.toLocaleString(undefined, { minimumFractionDigits: 2 })}
          </div>
        </div>

        <div style={{
          padding: "var(--space-2xl)",
          background: "var(--color-green-5)",
          borderRadius: "var(--radi-md)",
          border: "1px solid var(--color-green-20)",
        }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "var(--space-md)" }}>
            <span style={{ fontSize: "var(--font-size-text-sm)", fontWeight: "var(--font-weight-semi)", color: "var(--color-green-70)" }}>
              {allocation.stableToken}
            </span>
            <span style={{ fontSize: "var(--font-size-text-xs)", color: "var(--color-text-40)" }}>
              {(100 - allocation.currentAllocationPct).toFixed(1)}%
            </span>
          </div>
          <div style={{
            fontFamily: "var(--font-family-code), monospace",
            fontSize: "var(--font-size-text-lg)",
            fontWeight: "var(--font-weight-semi)",
            color: "var(--color-text-90)",
            marginBottom: "var(--space-xs)",
          }}>
            {allocation.stableBalance.toLocaleString(undefined, { minimumFractionDigits: 2 })}
          </div>
          <div style={{
            fontFamily: "var(--font-family-code), monospace",
            fontSize: "var(--font-size-text-xs)",
            color: "var(--color-text-40)",
          }}>
            ${allocation.stableValueUsd.toLocaleString(undefined, { minimumFractionDigits: 2 })}
          </div>
        </div>
      </div>
    </div>
  );
}
