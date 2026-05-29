"use client";

import type { PositionData } from "@/lib/types";

interface PositionCardProps {
  position: PositionData;
}

export function PositionCard({ position }: PositionCardProps) {
  const { tickLower, tickUpper, currentTick, drift, threshold, rangeWidth, inRange, timeInRangePct, positionOpenedAt, rebalanceCount } = position;

  // Calculate price marker position as percentage within the range
  const rangeTotal = tickUpper - tickLower;
  const pricePosition = rangeTotal > 0 ? ((currentTick - tickLower) / rangeTotal) * 100 : 50;
  const clampedPosition = Math.max(-5, Math.min(105, pricePosition));

  // Calculate how long the position has been open
  let positionAge = "--";
  if (positionOpenedAt) {
    const ageMs = Date.now() - new Date(positionOpenedAt).getTime();
    const hours = Math.floor(ageMs / 3600000);
    const mins = Math.floor((ageMs % 3600000) / 60000);
    positionAge = hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
  }

  const driftPct = threshold > 0 ? Math.round((drift / threshold) * 100) : 0;

  return (
    <div className="card">
      <div className="card-header">
        <span className="card-title">Active Price Range</span>
        <span
          style={{
            fontSize: "var(--font-size-text-xs)",
            fontWeight: "var(--font-weight-med)",
            color: inRange ? "var(--color-green-50)" : "var(--color-red-60)",
            background: inRange ? "var(--color-green-5)" : "var(--color-red-5)",
            padding: "var(--space-xxs) var(--space-md)",
            borderRadius: "var(--radi-xs)",
          }}
        >
          {inRange ? "Earning" : "Not Earning"}
        </span>
      </div>

      {/* Price Range Visualization */}
      <div style={{ marginBottom: "var(--space-md)" }}>
        <div style={{ fontSize: "var(--font-size-text-xs)", color: "var(--color-text-40)", marginBottom: "var(--space-lg)" }}>
          The agent earns fees when the market price (line) stays inside this zone. If it moves outside, the agent repositions.
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "var(--space-xs)", fontSize: "var(--font-size-text-xs)", color: "var(--color-text-40)" }}>
          <span>Low end</span>
          <span>High end</span>
        </div>
        <div style={{
          position: "relative",
          height: "32px",
          background: "var(--color-background-10)",
          borderRadius: "var(--radi-md)",
          overflow: "visible",
        }}>
          {/* Earning zone fill */}
          <div style={{
            position: "absolute",
            left: 0,
            right: 0,
            top: 0,
            bottom: 0,
            background: inRange ? "var(--color-green-5)" : "var(--color-red-5)",
            borderRadius: "var(--radi-md)",
            border: `1px solid ${inRange ? "var(--color-green-50)" : "var(--color-red-60)"}20`,
          }} />
          {/* Current market price marker */}
          <div style={{
            position: "absolute",
            left: `${clampedPosition}%`,
            top: "-4px",
            bottom: "-4px",
            width: "3px",
            background: inRange ? "var(--color-green-50)" : "var(--color-red-60)",
            borderRadius: "var(--radi-xs)",
            transform: "translateX(-50%)",
            boxShadow: `0 0 6px ${inRange ? "var(--color-green-50)" : "var(--color-red-60)"}`,
          }} />
          {/* Price label */}
          <div style={{
            position: "absolute",
            left: `${clampedPosition}%`,
            top: "-22px",
            transform: "translateX(-50%)",
            fontSize: "var(--font-size-text-xs)",
            fontFamily: "var(--font-family-code), monospace",
            color: inRange ? "var(--color-green-50)" : "var(--color-red-60)",
            fontWeight: "var(--font-weight-semi)",
            whiteSpace: "nowrap",
          }}>
            Market Price
          </div>
        </div>
      </div>

      {/* Metrics */}
      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(2, 1fr)",
        gap: "var(--space-2xl)",
        fontSize: "var(--font-size-text-sm)",
        paddingTop: "var(--space-2xl)",
        borderTop: "1px solid var(--color-border-20)",
      }}>
        <div>
          <div style={{ color: "var(--color-text-40)", fontSize: "var(--font-size-text-xs)", marginBottom: "2px" }}>Price Offset</div>
          <div style={{ fontFamily: "var(--font-family-code), monospace", color: "var(--color-text-80)" }}>
            {driftPct}% of limit
            <span style={{
              marginLeft: "var(--space-sm)",
              fontSize: "var(--font-size-text-xs)",
              color: driftPct > 75 ? "var(--color-yellow-50)" : "var(--color-text-40)",
            }}>
              {driftPct > 75 ? "nearing reposition" : ""}
            </span>
          </div>
        </div>
        <div>
          <div style={{ color: "var(--color-text-40)", fontSize: "var(--font-size-text-xs)", marginBottom: "2px" }}>Zone Width</div>
          <div style={{ fontFamily: "var(--font-family-code), monospace", color: "var(--color-text-80)" }}>
            {rangeWidth} price units
          </div>
        </div>
        <div>
          <div style={{ color: "var(--color-text-40)", fontSize: "var(--font-size-text-xs)", marginBottom: "2px" }}>Time Earning</div>
          <div style={{ fontFamily: "var(--font-family-code), monospace", color: "var(--color-text-80)" }}>
            {timeInRangePct}%
          </div>
        </div>
        <div>
          <div style={{ color: "var(--color-text-40)", fontSize: "var(--font-size-text-xs)", marginBottom: "2px" }}>Repositions</div>
          <div style={{ fontFamily: "var(--font-family-code), monospace", color: "var(--color-text-80)" }}>
            {rebalanceCount}
          </div>
        </div>
        <div style={{ gridColumn: "span 2" }}>
          <div style={{ color: "var(--color-text-40)", fontSize: "var(--font-size-text-xs)", marginBottom: "2px" }}>Time at Current Position</div>
          <div style={{ fontFamily: "var(--font-family-code), monospace", color: "var(--color-text-80)" }}>
            {positionAge}
          </div>
        </div>
      </div>
    </div>
  );
}
