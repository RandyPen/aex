"use client";

import type { FeeData } from "@/lib/types";

interface FeeEarningsProps {
  fees: FeeData;
  token0Symbol?: string;
  token1Symbol?: string;
}

export function FeeEarnings({ fees, token0Symbol = "ETH", token1Symbol = "USDC" }: FeeEarningsProps) {
  return (
    <div className="card">
      <div className="card-header">
        <span className="card-title">Fee Earnings</span>
        <div style={{ textAlign: "right" }}>
          <span style={{
            fontSize: "var(--font-size-text-xs)",
            fontFamily: "var(--font-family-code), monospace",
            color: "var(--color-green-50)",
          }}>
            {fees.feeApyEstimate.toFixed(1)}% APY est.
          </span>
        </div>
      </div>

      {/* Total fees */}
      <div style={{
        padding: "var(--space-2xl)",
        background: "var(--color-background-10)",
        borderRadius: "var(--radi-md)",
        marginBottom: "var(--space-2xl)",
        textAlign: "center",
      }}>
        <div style={{ fontSize: "var(--font-size-text-xs)", color: "var(--color-text-40)", marginBottom: "var(--space-xs)" }}>
          Total Fees Earned
        </div>
        <div style={{
          fontFamily: "var(--font-family-code), monospace",
          fontSize: "var(--font-size-h5)",
          fontWeight: "var(--font-weight-semi)",
          color: "var(--color-green-50)",
        }}>
          ${fees.totalFeesUsd.toFixed(2)}
        </div>
        <div style={{
          fontFamily: "var(--font-family-code), monospace",
          fontSize: "var(--font-size-text-xs)",
          color: "var(--color-text-40)",
          marginTop: "var(--space-xs)",
        }}>
          {fees.totalFeesToken0.toFixed(6)} {token0Symbol} + {fees.totalFeesToken1.toFixed(2)} {token1Symbol}
        </div>
      </div>

      {/* 24h fees */}
      <div className="config-row">
        <span className="config-key">24h Fees</span>
        <div style={{ textAlign: "right" }}>
          <span className="config-value" style={{ color: "var(--color-green-50)" }}>
            ${fees.fees24hUsd.toFixed(2)}
          </span>
          <div style={{ fontSize: "var(--font-size-text-xs)", color: "var(--color-text-40)" }}>
            {fees.fees24hToken0.toFixed(6)} {token0Symbol} + {fees.fees24hToken1.toFixed(2)} {token1Symbol}
          </div>
        </div>
      </div>

      <div className="config-row">
        <span className="config-key">Fee APY Estimate</span>
        <span className="config-value" style={{ color: "var(--color-green-50)" }}>
          {fees.feeApyEstimate.toFixed(1)}%
        </span>
      </div>

      <div className="config-row">
        <span className="config-key">Collections</span>
        <span className="config-value">{fees.feesCollectedCount}</span>
      </div>
    </div>
  );
}
