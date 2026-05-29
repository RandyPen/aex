"use client";

import type { PoolPosition } from "@/lib/types";

interface PortfolioBalanceProps {
  position: PoolPosition;
}

export function PortfolioBalance({ position }: PortfolioBalanceProps) {
  const token0Pct = position.totalValueUsd > 0
    ? (position.token0ValueUsd / position.totalValueUsd) * 100
    : 50;

  return (
    <div className="card">
      <div className="card-header">
        <span className="card-title">Portfolio Balance</span>
        <span style={{
          fontSize: "var(--font-size-h6)",
          fontWeight: "var(--font-weight-semi)",
          fontFamily: "var(--font-family-code), monospace",
          color: "var(--color-text-90)",
        }}>
          ${position.totalValueUsd.toLocaleString(undefined, { minimumFractionDigits: 2 })}
        </span>
      </div>

      {/* Balance bar */}
      <div style={{
        display: "flex",
        height: "12px",
        borderRadius: "var(--radi-full)",
        overflow: "hidden",
        marginBottom: "var(--space-3xl)",
      }}>
        <div style={{
          width: `${token0Pct}%`,
          background: "var(--color-blue-50)",
          transition: "width 300ms ease",
        }} />
        <div style={{
          width: `${100 - token0Pct}%`,
          background: "var(--color-green-50)",
          transition: "width 300ms ease",
        }} />
      </div>

      {/* Token breakdown */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "var(--space-3xl)" }}>
        <div style={{
          padding: "var(--space-2xl)",
          background: "var(--color-blue-5)",
          borderRadius: "var(--radi-md)",
          border: "1px solid var(--color-blue-20)",
        }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "var(--space-md)" }}>
            <span style={{ fontSize: "var(--font-size-text-sm)", fontWeight: "var(--font-weight-semi)", color: "var(--color-blue-70)" }}>
              {position.token0Symbol}
            </span>
            <span style={{ fontSize: "var(--font-size-text-xs)", color: "var(--color-text-40)" }}>
              {token0Pct.toFixed(1)}%
            </span>
          </div>
          <div style={{
            fontFamily: "var(--font-family-code), monospace",
            fontSize: "var(--font-size-text-lg)",
            fontWeight: "var(--font-weight-semi)",
            color: "var(--color-text-90)",
            marginBottom: "var(--space-xs)",
          }}>
            {position.token0Amount.toFixed(4)}
          </div>
          <div style={{
            fontFamily: "var(--font-family-code), monospace",
            fontSize: "var(--font-size-text-xs)",
            color: "var(--color-text-40)",
          }}>
            ${position.token0ValueUsd.toLocaleString(undefined, { minimumFractionDigits: 2 })}
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
              {position.token1Symbol}
            </span>
            <span style={{ fontSize: "var(--font-size-text-xs)", color: "var(--color-text-40)" }}>
              {(100 - token0Pct).toFixed(1)}%
            </span>
          </div>
          <div style={{
            fontFamily: "var(--font-family-code), monospace",
            fontSize: "var(--font-size-text-lg)",
            fontWeight: "var(--font-weight-semi)",
            color: "var(--color-text-90)",
            marginBottom: "var(--space-xs)",
          }}>
            {position.token1Amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
          </div>
          <div style={{
            fontFamily: "var(--font-family-code), monospace",
            fontSize: "var(--font-size-text-xs)",
            color: "var(--color-text-40)",
          }}>
            ${position.token1ValueUsd.toLocaleString(undefined, { minimumFractionDigits: 2 })}
          </div>
        </div>
      </div>
    </div>
  );
}
