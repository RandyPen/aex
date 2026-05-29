"use client";

import type { PoolPosition } from "@/lib/types";

interface PoolStatusProps {
  position: PoolPosition;
}

export function PoolStatus({ position }: PoolStatusProps) {
  const rangeWidth = position.tickUpper - position.tickLower;
  const tickFromCenter = position.currentTick - Math.round((position.tickLower + position.tickUpper) / 2);
  const rangePct = rangeWidth > 0 ? ((tickFromCenter / (rangeWidth / 2)) * 100) : 0;
  const clampedPct = Math.max(-100, Math.min(100, rangePct));

  return (
    <div className="card">
      <div className="card-header">
        <span className="card-title">Pool Position</span>
        <span style={{
          fontSize: "var(--font-size-text-xs)",
          fontFamily: "var(--font-family-code), monospace",
          color: position.inRange ? "var(--color-green-50)" : "var(--color-red-60)",
        }}>
          {position.inRange ? "In Range" : "Out of Range"}
        </span>
      </div>

      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "var(--space-3xl)" }}>
        <div>
          <div style={{ fontSize: "var(--font-size-text-xs)", color: "var(--color-text-40)", marginBottom: "2px" }}>Pool</div>
          <div style={{ fontSize: "var(--font-size-text-md)", fontWeight: "var(--font-weight-semi)", color: "var(--color-text-90)" }}>
            {position.token0Symbol}/{position.token1Symbol}
          </div>
          <span className="tag tag-protocol" style={{ marginTop: "var(--space-xs)" }}>
            {(position.fee / 10000).toFixed(2)}% fee tier
          </span>
        </div>
        <div style={{ textAlign: "right" }}>
          <div style={{ fontSize: "var(--font-size-text-xs)", color: "var(--color-text-40)", marginBottom: "2px" }}>Token ID</div>
          <span className="mono" style={{ color: "var(--color-text-60)" }}>#{position.tokenId}</span>
        </div>
      </div>

      {/* Range visualizer */}
      <div style={{ marginBottom: "var(--space-3xl)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: "var(--font-size-text-xs)", color: "var(--color-text-40)", marginBottom: "var(--space-sm)" }}>
          <span>${position.priceLower.toFixed(2)}</span>
          <span>Current: ${position.currentPrice.toFixed(2)}</span>
          <span>${position.priceUpper.toFixed(2)}</span>
        </div>
        <div style={{
          position: "relative",
          height: "8px",
          background: "var(--color-background-10)",
          borderRadius: "var(--radi-full)",
          overflow: "visible",
        }}>
          <div style={{
            position: "absolute",
            left: "0",
            right: "0",
            top: "0",
            bottom: "0",
            background: position.inRange ? "var(--color-green-5)" : "var(--color-red-5)",
            border: `1px solid ${position.inRange ? "var(--color-green-50)" : "var(--color-red-60)"}`,
            borderRadius: "var(--radi-full)",
          }} />
          <div style={{
            position: "absolute",
            left: `${50 + clampedPct / 2}%`,
            top: "-4px",
            width: "16px",
            height: "16px",
            borderRadius: "var(--radi-full)",
            background: position.inRange ? "var(--color-green-50)" : "var(--color-red-60)",
            transform: "translateX(-50%)",
            boxShadow: `0 0 6px ${position.inRange ? "var(--color-green-50)" : "var(--color-red-60)"}`,
          }} />
        </div>
      </div>

      {/* Tick details */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "var(--space-2xl)", fontSize: "var(--font-size-text-xs)" }}>
        <div>
          <div style={{ color: "var(--color-text-40)", marginBottom: "2px" }}>Lower Tick</div>
          <span className="mono" style={{ color: "var(--color-text-60)" }}>{position.tickLower}</span>
        </div>
        <div style={{ textAlign: "center" }}>
          <div style={{ color: "var(--color-text-40)", marginBottom: "2px" }}>Current Tick</div>
          <span className="mono" style={{ color: "var(--color-text-90)", fontWeight: "var(--font-weight-semi)" }}>{position.currentTick}</span>
        </div>
        <div style={{ textAlign: "right" }}>
          <div style={{ color: "var(--color-text-40)", marginBottom: "2px" }}>Upper Tick</div>
          <span className="mono" style={{ color: "var(--color-text-60)" }}>{position.tickUpper}</span>
        </div>
      </div>

      <div style={{ marginTop: "var(--space-2xl)", paddingTop: "var(--space-2xl)", borderTop: "1px solid var(--color-border-20)" }}>
        <div className="config-row">
          <span className="config-key">Liquidity</span>
          <span className="config-value">{BigInt(position.liquidity).toLocaleString()}</span>
        </div>
        <div className="config-row">
          <span className="config-key">Pool Address</span>
          <span className="config-value" style={{ fontSize: "var(--font-size-text-xs)" }}>
            {position.pool.slice(0, 10)}...{position.pool.slice(-8)}
          </span>
        </div>
      </div>
    </div>
  );
}
