"use client";

import type { ThresholdState } from "@/lib/types";

interface ThresholdStatusProps {
  threshold: ThresholdState;
}

const zoneLabels: Record<string, string> = {
  hold: "Hold Zone",
  sell_zone: "Sell Zone",
  buy_zone: "Buy Zone",
};

const zoneColors: Record<string, string> = {
  hold: "var(--color-green-50)",
  sell_zone: "var(--color-coral-50)",
  buy_zone: "var(--color-blue-50)",
};

const zoneBgColors: Record<string, string> = {
  hold: "var(--color-green-5)",
  sell_zone: "var(--color-coral-5)",
  buy_zone: "var(--color-blue-5)",
};

export function ThresholdStatus({ threshold }: ThresholdStatusProps) {
  const rangeWidth = threshold.highThreshold - threshold.lowThreshold;
  const pricePosition = rangeWidth > 0
    ? ((threshold.currentPrice - threshold.lowThreshold) / rangeWidth) * 100
    : 50;
  const clampedPosition = Math.max(0, Math.min(100, pricePosition));

  return (
    <div className="card">
      <div className="card-header">
        <span className="card-title">Threshold Status</span>
        <span style={{
          fontSize: "var(--font-size-text-xs)",
          fontWeight: "var(--font-weight-semi)",
          padding: "var(--space-xxs) var(--space-lg)",
          borderRadius: "var(--radi-xs)",
          color: zoneColors[threshold.zone],
          background: zoneBgColors[threshold.zone],
        }}>
          {zoneLabels[threshold.zone]}
        </span>
      </div>

      {/* Price indicator bar */}
      <div style={{ marginBottom: "var(--space-3xl)" }}>
        <div style={{
          position: "relative",
          height: "8px",
          background: "var(--color-background-10)",
          borderRadius: "var(--radi-full)",
          overflow: "visible",
        }}>
          {/* Buy zone indicator (left) */}
          <div style={{
            position: "absolute",
            left: 0,
            top: 0,
            width: "5%",
            height: "100%",
            background: "var(--color-blue-20)",
            borderRadius: "var(--radi-full) 0 0 var(--radi-full)",
          }} />
          {/* Hold zone (middle) */}
          <div style={{
            position: "absolute",
            left: "5%",
            top: 0,
            width: "90%",
            height: "100%",
            background: "var(--color-green-10)",
          }} />
          {/* Sell zone indicator (right) */}
          <div style={{
            position: "absolute",
            right: 0,
            top: 0,
            width: "5%",
            height: "100%",
            background: "var(--color-coral-20)",
            borderRadius: "0 var(--radi-full) var(--radi-full) 0",
          }} />
          {/* Current price marker */}
          <div style={{
            position: "absolute",
            left: `${clampedPosition}%`,
            top: "-4px",
            width: "16px",
            height: "16px",
            borderRadius: "var(--radi-full)",
            background: zoneColors[threshold.zone],
            border: "2px solid var(--color-background-0)",
            transform: "translateX(-50%)",
            boxShadow: "0 2px 4px rgba(0,0,0,0.2)",
          }} />
        </div>
        <div style={{
          display: "flex",
          justifyContent: "space-between",
          marginTop: "var(--space-md)",
          fontSize: "var(--font-size-text-xs)",
          color: "var(--color-text-40)",
          fontFamily: "var(--font-family-code), monospace",
        }}>
          <span>${threshold.lowThreshold.toLocaleString()}</span>
          <span>${threshold.highThreshold.toLocaleString()}</span>
        </div>
      </div>

      <div className="config-row">
        <span className="config-key">Current Price</span>
        <span className="config-value" style={{ fontSize: "var(--font-size-text-lg)", fontWeight: "var(--font-weight-semi)" }}>
          ${threshold.currentPrice.toLocaleString(undefined, { minimumFractionDigits: 2 })}
        </span>
      </div>
      <div className="config-row">
        <span className="config-key">High Threshold (Sell)</span>
        <span className="config-value" style={{ color: "var(--color-coral-50)" }}>
          ${threshold.highThreshold.toLocaleString(undefined, { minimumFractionDigits: 2 })}
        </span>
      </div>
      <div className="config-row">
        <span className="config-key">Low Threshold (Buy)</span>
        <span className="config-value" style={{ color: "var(--color-blue-50)" }}>
          ${threshold.lowThreshold.toLocaleString(undefined, { minimumFractionDigits: 2 })}
        </span>
      </div>
      <div className="config-row">
        <span className="config-key">Pair</span>
        <span className="config-value">{threshold.targetToken} / {threshold.stableToken}</span>
      </div>
    </div>
  );
}
