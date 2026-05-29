"use client";

import type { VolatilityData } from "@/lib/types";

interface VolatilityCardProps {
  volatility: VolatilityData;
}

function getVolatilityLevel(vol: number): { label: string; color: string; bg: string } {
  if (vol < 5) return { label: "Very Low", color: "var(--color-green-50)", bg: "var(--color-green-5)" };
  if (vol < 20) return { label: "Low", color: "var(--color-green-50)", bg: "var(--color-green-5)" };
  if (vol < 50) return { label: "Moderate", color: "var(--color-yellow-50)", bg: "var(--color-yellow-5)" };
  if (vol < 100) return { label: "High", color: "var(--color-orange-50)", bg: "var(--color-orange-5)" };
  return { label: "Very High", color: "var(--color-red-60)", bg: "var(--color-red-5)" };
}

export function VolatilityCard({ volatility }: VolatilityCardProps) {
  const { volatility: vol, volatilitySamples, adaptiveRange, baseRange, recommendation } = volatility;
  const level = getVolatilityLevel(vol);

  const rangeChange = adaptiveRange - baseRange;
  const rangeChangeLabel = rangeChange > 0 ? `+${rangeChange}` : rangeChange === 0 ? "No change" : `${rangeChange}`;

  return (
    <div className="card">
      <div className="card-header">
        <span className="card-title">Market Volatility</span>
        <span style={{
          fontSize: "var(--font-size-text-xs)",
          fontWeight: "var(--font-weight-med)",
          color: level.color,
          background: level.bg,
          padding: "var(--space-xxs) var(--space-md)",
          borderRadius: "var(--radi-xs)",
        }}>
          {level.label}
        </span>
      </div>

      <div style={{ fontSize: "var(--font-size-text-xs)", color: "var(--color-text-40)", marginBottom: "var(--space-2xl)" }}>
        How much the price is moving. The agent uses this to decide how wide to set its earning zone &mdash; wider in choppy markets, tighter in calm ones.
      </div>

      {/* Volatility Gauge */}
      <div style={{ marginBottom: "var(--space-3xl)" }}>
        <div style={{
          display: "flex",
          justifyContent: "space-between",
          marginBottom: "var(--space-xs)",
          fontSize: "var(--font-size-text-xs)",
          color: "var(--color-text-40)",
        }}>
          <span>Calm</span>
          <span>Choppy</span>
        </div>
        <div style={{
          position: "relative",
          height: "8px",
          background: "var(--color-background-10)",
          borderRadius: "var(--radi-full)",
          overflow: "hidden",
        }}>
          <div style={{
            position: "absolute",
            left: 0,
            top: 0,
            bottom: 0,
            width: `${Math.min(100, vol)}%`,
            background: `linear-gradient(to right, var(--color-green-50), var(--color-yellow-50), var(--color-red-60))`,
            borderRadius: "var(--radi-full)",
            transition: "width 0.3s ease",
          }} />
        </div>
        <div style={{
          textAlign: "center",
          marginTop: "var(--space-sm)",
          fontFamily: "var(--font-family-code), monospace",
          fontSize: "var(--font-size-h6)",
          fontWeight: "var(--font-weight-semi)",
          color: level.color,
        }}>
          {vol.toFixed(1)}
        </div>
        <div style={{
          textAlign: "center",
          fontSize: "var(--font-size-text-xs)",
          color: "var(--color-text-40)",
        }}>
          price movement score ({volatilitySamples} checks)
        </div>
      </div>

      {/* How the agent adapts */}
      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(3, 1fr)",
        gap: "var(--space-2xl)",
        fontSize: "var(--font-size-text-sm)",
        marginBottom: "var(--space-2xl)",
      }}>
        <div>
          <div style={{ color: "var(--color-text-40)", fontSize: "var(--font-size-text-xs)", marginBottom: "2px" }}>Default Zone</div>
          <div style={{ fontFamily: "var(--font-family-code), monospace", color: "var(--color-text-60)" }}>
            {baseRange}
          </div>
        </div>
        <div>
          <div style={{ color: "var(--color-text-40)", fontSize: "var(--font-size-text-xs)", marginBottom: "2px" }}>Current Zone</div>
          <div style={{ fontFamily: "var(--font-family-code), monospace", color: "var(--color-text-80)", fontWeight: "var(--font-weight-semi)" }}>
            {adaptiveRange}
          </div>
        </div>
        <div>
          <div style={{ color: "var(--color-text-40)", fontSize: "var(--font-size-text-xs)", marginBottom: "2px" }}>Adjustment</div>
          <div style={{
            fontFamily: "var(--font-family-code), monospace",
            color: rangeChange > 0 ? "var(--color-yellow-50)" : rangeChange < 0 ? "var(--color-green-50)" : "var(--color-text-60)",
          }}>
            {rangeChangeLabel}
          </div>
        </div>
      </div>

      {/* Recommendation */}
      <div style={{
        padding: "var(--space-2xl)",
        background: "var(--color-background-10)",
        borderRadius: "var(--radi-md)",
        fontSize: "var(--font-size-text-xs)",
        color: "var(--color-text-60)",
        lineHeight: "var(--line-height-text-sm)",
      }}>
        {recommendation}
      </div>
    </div>
  );
}
